-- ============================================================
-- 应用内删除账号:删库前必须先处理的三件事
--
-- 账号本身(auth.users)由 Edge Function `delete-account` 用 service_role 删除,
-- 之后几乎所有用户数据靠外键 ON DELETE CASCADE 自动清理。但有三处不会自动处理好:
--
--  1. 你创建的 Crew:crews.creator_id 是 ON DELETE CASCADE,直接删账号会把整个 Crew
--     连同其他成员一起删掉。→ 先把所有权转给"加入最早的其他成员";只有你一个人的 Crew
--     才随账号一起删除。
--     同样地,你在其他人 Crew 里发起的挑战(crew_challenges.created_by 也是 CASCADE)
--     改挂到该 Crew 的所有者名下,避免 Crew 里的挑战随你的账号一起消失。
--  2. coach_waitlist:user_id 是 ON DELETE SET NULL,邮箱会留在库里。邮箱是个人信息,
--     → 按 user_id 和同一邮箱都删掉。
--  3. Storage 里的练习照片:不会级联,而且 storage.objects 有触发器禁止用 SQL 直接删
--     (必须走 Storage API),所以由 Edge Function 负责,不在这里。
--
-- prepare_account_deletion 只授权给 service_role,客户端永远调用不了。
-- 它是幂等的:失败后重试不会出错,也不会重复转移。
-- ============================================================
create or replace function public.prepare_account_deletion(p_user uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_crew        record;
  v_new_owner   uuid;
  v_transferred int := 0;
  v_left_to_go  int := 0;
  v_waitlist    int := 0;
  v_email       text;
begin
  if p_user is null then
    raise exception 'user_required' using errcode = '22023';
  end if;

  -- 1. 名下的 Crew:有其他成员 → 转让给加入最早的那位;没有 → 留着随账号删除
  for v_crew in select id from public.crews where creator_id = p_user loop
    select cm.user_id into v_new_owner
      from public.crew_members cm
     where cm.crew_id = v_crew.id and cm.user_id <> p_user
     order by cm.joined_at asc, cm.id asc
     limit 1;

    if v_new_owner is null then
      v_left_to_go := v_left_to_go + 1;
    else
      update public.crews set creator_id = v_new_owner where id = v_crew.id;
      update public.crew_members set role = 'owner'
       where crew_id = v_crew.id and user_id = v_new_owner;
      v_transferred := v_transferred + 1;
    end if;
  end loop;

  -- 你发起的挑战:Crew 会留下的(所有者不是你),挑战改挂到所有者名下
  update public.crew_challenges ch set created_by = c.creator_id
    from public.crews c
   where ch.crew_id = c.id and ch.created_by = p_user and c.creator_id <> p_user;

  -- 2. 候补名单:按 user_id 和同一邮箱都删
  select lower(email) into v_email from auth.users where id = p_user;
  delete from public.coach_waitlist
   where user_id = p_user or (v_email is not null and lower(email) = v_email);
  get diagnostics v_waitlist = row_count;

  return jsonb_build_object(
    'crews_transferred', v_transferred,
    'crews_deleted_with_account', v_left_to_go,
    'waitlist_rows_deleted', v_waitlist
  );
end $$;

revoke execute on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant  execute on function public.prepare_account_deletion(uuid) to service_role;
