-- ============================================================
-- P0: 修复 Crew / Buddies 的 RLS
--
-- 线上现状(2026-10-16 用 `supabase db dump --linked` 核对):
--   * crew_members / outing_members 的 SELECT 策略直接查询自己 →
--     每次查询都报 "infinite recursion detected in policy"
--   * outings 的 SELECT 策略经 outing_members 间接递归,同样报错
--   * crews 只有"已是成员才可见" → 创建者 insert..returning 被拒,
--     邀请码查不到任何 crew
--   * 策略里 `m.outing_id = id` / `m2.outing_id = outing_id` 是列名歧义,
--     实际恒真或恒假
--   * outing_members 允许自插 status='joined',绕过审批和名额
--
-- 修法:用 SECURITY DEFINER 的小函数承接"是不是成员"这类判断,策略只调函数,
-- 不再自引用;加入 / 创建 crew 走 RPC(服务端校验邀请码和名额);
-- outing_members 加 BEFORE 触发器在服务端强制审批规则、名额和主键不可变。
-- 纯增量:不删表、不改列、不动数据。
-- ============================================================

-- ── 0. 辅助函数 ───────────────────────────────────────────────
create or replace function public.is_crew_member(p_crew_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.crew_members
    where crew_id = p_crew_id and user_id = auth.uid()
  );
$$;

-- 调用者在该局的成员状态('joined' | 'pending' | null)
create or replace function public.outing_member_status(p_outing_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select status from public.outing_members
  where outing_id = p_outing_id and user_id = auth.uid();
$$;

create or replace function public.is_outing_organizer(p_outing_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.outings
    where id = p_outing_id and organizer_id = auth.uid()
  );
$$;

-- 与 outings 的 SELECT 规则一致:发起人 / 成员 / 同城
create or replace function public.can_see_outing(p_outing_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.outings o
    where o.id = p_outing_id
      and (
        o.organizer_id = auth.uid()
        or exists (select 1 from public.outing_members m
                   where m.outing_id = o.id and m.user_id = auth.uid())
        or lower(o.city) = lower((select p.city from public.profiles p where p.id = auth.uid()))
      )
  );
$$;

revoke execute on function public.is_crew_member(uuid)         from public, anon;
revoke execute on function public.outing_member_status(uuid)   from public, anon;
revoke execute on function public.is_outing_organizer(uuid)    from public, anon;
revoke execute on function public.can_see_outing(uuid)         from public, anon;
grant  execute on function public.is_crew_member(uuid)         to authenticated;
grant  execute on function public.outing_member_status(uuid)   to authenticated;
grant  execute on function public.is_outing_organizer(uuid)    to authenticated;
grant  execute on function public.can_see_outing(uuid)         to authenticated;

-- ── 1. Crew ──────────────────────────────────────────────────
drop policy if exists "crew_members_can_view_crew" on public.crews;
create policy "crews_select_creator_or_member" on public.crews
  for select to authenticated
  using (creator_id = auth.uid() or public.is_crew_member(id));

drop policy if exists "crew_members_view_members" on public.crew_members;
create policy "crew_members_select_same_crew" on public.crew_members
  for select to authenticated
  using (public.is_crew_member(crew_id));

-- 不再允许客户端直接 insert crew_members:加入走 join_crew(),创建走 create_crew()
drop policy if exists "user_can_join_crew" on public.crew_members;

drop policy if exists "crew_members_view_challenges" on public.crew_challenges;
create policy "crew_challenges_select_member" on public.crew_challenges
  for select to authenticated
  using (public.is_crew_member(crew_id));

drop policy if exists "crew_member_create_challenge" on public.crew_challenges;
create policy "crew_challenges_insert_member" on public.crew_challenges
  for insert to authenticated
  with check (created_by = auth.uid() and public.is_crew_member(crew_id));

-- 创建 crew:服务端生成邀请码(唯一约束兜底碰撞),并原子地把创建者写成 owner
create or replace function public.create_crew(
  p_name text,
  p_description text default '',
  p_emoji text default 'golf-outline'
) returns public.crews
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code  text;
  v_crew  public.crews;
  v_try   int := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_name is null or length(btrim(p_name)) = 0 or length(btrim(p_name)) > 40 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;

  loop
    select string_agg(substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1), '')
      into v_code from generate_series(1, 6);
    begin
      insert into public.crews (name, description, emoji, creator_id, invite_code)
      values (btrim(p_name), left(coalesce(p_description, ''), 120),
              coalesce(nullif(btrim(p_emoji), ''), 'golf-outline'), v_uid, v_code)
      returning * into v_crew;
      exit;
    exception when unique_violation then
      v_try := v_try + 1;
      if v_try > 10 then raise; end if;
    end;
  end loop;

  insert into public.crew_members (crew_id, user_id, role)
  values (v_crew.id, v_uid, 'owner');

  return v_crew;
end $$;

-- 凭邀请码加入:错误用固定的 message 返回,客户端按 message 映射文案
--   invalid_code | already_member | crew_full | not_authenticated
create or replace function public.join_crew(p_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_crew public.crews;
  v_cnt  int;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_crew from public.crews
   where invite_code = upper(btrim(p_code))
   for update;                       -- 串行化同一 crew 的并发加入,名额不会超
  if not found then
    raise exception 'invalid_code' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.crew_members
              where crew_id = v_crew.id and user_id = v_uid) then
    raise exception 'already_member' using errcode = '23505';
  end if;

  select count(*) into v_cnt from public.crew_members where crew_id = v_crew.id;
  if v_cnt >= v_crew.max_members then
    raise exception 'crew_full' using errcode = '53400';
  end if;

  insert into public.crew_members (crew_id, user_id, role)
  values (v_crew.id, v_uid, 'member');
  return v_crew.id;
end $$;

revoke execute on function public.create_crew(text, text, text) from public, anon;
revoke execute on function public.join_crew(text)               from public, anon;
grant  execute on function public.create_crew(text, text, text) to authenticated;
grant  execute on function public.join_crew(text)               to authenticated;

-- ── 2. Buddies ───────────────────────────────────────────────
drop policy if exists "read outings (own/joined/same-city)" on public.outings;
create policy "read outings (own/joined/same-city)" on public.outings
  for select to authenticated
  using (
    organizer_id = auth.uid()
    or public.outing_member_status(id) is not null
    or lower(city) = lower((select p.city from public.profiles p where p.id = auth.uid()))
  );

drop policy if exists "read members (organizer or member)" on public.outing_members;
create policy "read members (organizer or member)" on public.outing_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_outing_organizer(outing_id)
    or public.outing_member_status(outing_id) is not null
  );

-- 只能给自己加,且必须看得到这个局;审批 / 名额 / 状态由下面的触发器强制
drop policy if exists "user joins (insert self)" on public.outing_members;
create policy "user joins (insert self)" on public.outing_members
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_outing(outing_id));

drop policy if exists "organizer approves (update)" on public.outing_members;
create policy "organizer approves (update)" on public.outing_members
  for update to authenticated
  using (public.is_outing_organizer(outing_id))
  with check (public.is_outing_organizer(outing_id));

drop policy if exists "self-leave or organizer-remove (delete)" on public.outing_members;
create policy "self-leave or organizer-remove (delete)" on public.outing_members
  for delete to authenticated
  using (user_id = auth.uid() or public.is_outing_organizer(outing_id));

drop policy if exists "read comments (can see outing)" on public.outing_comments;
create policy "read comments (can see outing)" on public.outing_comments
  for select to authenticated
  using (public.can_see_outing(outing_id));

drop policy if exists "joined member posts comment" on public.outing_comments;
create policy "joined member posts comment" on public.outing_comments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (public.is_outing_organizer(outing_id)
         or public.outing_member_status(outing_id) = 'joined')
  );

-- 服务端强制规则(RLS 只能校验"是不是本人",校验不了名额和审批流)
create or replace function public.guard_outing_member()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_o   public.outings;
  v_cnt int;
begin
  select * into v_o from public.outings where id = NEW.outing_id for update;
  if not found then
    raise exception 'outing_not_found' using errcode = 'P0002';
  end if;

  if TG_OP = 'UPDATE' then
    if NEW.outing_id <> OLD.outing_id or NEW.user_id <> OLD.user_id then
      raise exception 'member_keys_immutable' using errcode = '42501';
    end if;
  else
    if v_o.status <> 'open' then
      raise exception 'outing_not_open' using errcode = 'P0001';
    end if;
    if NEW.user_id = v_o.organizer_id then
      if NEW.status <> 'joined' then
        raise exception 'organizer_must_be_joined' using errcode = 'P0001';
      end if;
    elsif v_o.join_mode = 'approve' and NEW.status <> 'pending' then
      raise exception 'approval_required' using errcode = '42501';
    end if;
  end if;

  if NEW.status = 'joined' and (TG_OP = 'INSERT' or OLD.status <> 'joined') then
    if TG_OP = 'UPDATE' and v_o.status in ('cancelled', 'done') then
      raise exception 'outing_not_open' using errcode = 'P0001';
    end if;
    select count(*) into v_cnt from public.outing_members
     where outing_id = NEW.outing_id and status = 'joined';
    if v_cnt >= v_o.slots_total then
      raise exception 'outing_full' using errcode = 'P0001';
    end if;
  end if;

  return NEW;
end $$;

drop trigger if exists outing_members_guard on public.outing_members;
create trigger outing_members_guard
  before insert or update on public.outing_members
  for each row execute function public.guard_outing_member();

-- 既有触发器函数补 search_path(SECURITY DEFINER 的标准加固)
alter function public.sync_outing_status() set search_path = public;
