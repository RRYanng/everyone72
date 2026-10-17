-- ============================================================
-- P2: 限频 —— Crew 邀请码暴力枚举、候补名单刷表
--
-- 1) join_crew:邀请码是 6 位(32 个字符),空间约 10 亿;之前可以无限次尝试。
--    现在每个用户 15 分钟内最多失败 8 次、24 小时内最多失败 30 次,超过就拒绝(PT429)。
--    注意:失败的尝试必须"提交"才能被记住,所以邀请码不存在时不再 raise
--    (raise 会让事务回滚、把失败记录一起丢掉),而是记一笔失败并返回 NULL,
--    客户端把 NULL 当作 invalid_code 处理。
--
-- 2) coach_waitlist:之前匿名用户也能直接 insert(策略 WITH CHECK (true) 的变体),
--    可以被脚本无限灌垃圾邮箱。现在客户端不能直接写表,只能调 join_coach_waitlist():
--    必须登录、邮箱格式校验、每个用户 24 小时最多新增 3 条、已在名单里的邮箱当作成功。
-- ============================================================

-- ── 1. Crew 邀请码限频 ───────────────────────────────────────
create table if not exists public.crew_join_failures (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists crew_join_failures_user_time_idx
  on public.crew_join_failures (user_id, created_at desc);
alter table public.crew_join_failures enable row level security;       -- 不建策略:客户端完全不可见
revoke all on public.crew_join_failures from anon, authenticated;

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

  if (select count(*) from public.crew_join_failures
       where user_id = v_uid and created_at > now() - interval '15 minutes') >= 8
     or (select count(*) from public.crew_join_failures
          where user_id = v_uid and created_at > now() - interval '24 hours') >= 30 then
    raise exception 'too_many_attempts' using errcode = 'PT429';
  end if;

  select * into v_crew from public.crews
   where invite_code = upper(btrim(p_code))
   for update;                       -- 串行化同一 crew 的并发加入,名额不会超
  if not found then
    insert into public.crew_join_failures (user_id) values (v_uid);
    delete from public.crew_join_failures
     where user_id = v_uid and created_at < now() - interval '2 days';
    return null;                     -- 不 raise:要让这条失败记录提交
  end if;

  if exists (select 1 from public.crew_members
              where crew_id = v_crew.id and user_id = v_uid) then
    raise exception 'already_member' using errcode = '23505';
  end if;

  select count(*) into v_cnt from public.crew_members where crew_id = v_crew.id;
  if v_cnt >= v_crew.max_members then
    raise exception 'crew_full' using errcode = 'PT409';
  end if;

  insert into public.crew_members (crew_id, user_id, role)
  values (v_crew.id, v_uid, 'member');
  return v_crew.id;
end $$;
revoke execute on function public.join_crew(text) from public, anon;
grant  execute on function public.join_crew(text) to authenticated;

-- ── 2. 候补名单 ──────────────────────────────────────────────
create or replace function public.join_coach_waitlist(p_email text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  -- 已经在名单里:直接当作成功(不新增、不暴露是谁登记的)
  if exists (select 1 from public.coach_waitlist where lower(email) = v_email) then
    return true;
  end if;

  if (select count(*) from public.coach_waitlist
       where user_id = v_uid and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'too_many_requests' using errcode = 'PT429';
  end if;

  begin
    insert into public.coach_waitlist (email, user_id) values (v_email, v_uid);
  exception when unique_violation then
    null;                            -- 并发下被别人抢先插入:同样当作成功
  end;
  return true;
end $$;
revoke execute on function public.join_coach_waitlist(text) from public, anon;
grant  execute on function public.join_coach_waitlist(text) to authenticated;

-- 表本身不再允许客户端写
drop policy if exists "Insert own waitlist entry" on public.coach_waitlist;
revoke all on public.coach_waitlist from anon, authenticated;
grant select on public.coach_waitlist to authenticated;      -- "Read own waitlist entry" 策略保持不变
