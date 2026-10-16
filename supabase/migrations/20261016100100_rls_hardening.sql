-- ============================================================
-- P0: RLS 加固(线上现状核对后的补丁)
--
--  1. friendships
--     * INSERT 不校验 status → 任何人可给自己插一条 'accepted' 好友关系,
--       而 practice_logs 的可见性正是靠"已接受的好友关系"判断 → 能读任意人的打卡。
--     * 没有 DELETE 策略 → 取消请求 / 删好友静默失败(0 行,不报错)。
--     * UPDATE 没有 WITH CHECK,可改 user_id / friend_id。
--  2. reactions:任何人可读所有反应,也可对看不到的打卡点赞 / 评论。
--  3. user_stats / streak_leaderboard:匿名角色可读。
--  4. coach_waitlist:INSERT with check (true) → 可伪造 user_id。
-- 纯增量;不改表结构、不动数据。
-- ============================================================

-- ── 1. friendships ───────────────────────────────────────────
drop policy if exists "Users can insert friend requests" on public.friendships;
create policy "Users can insert friend requests" on public.friendships
  for insert to authenticated
  with check (auth.uid() = user_id and user_id <> friend_id and status = 'pending');

drop policy if exists "Users can update friendship status" on public.friendships;
create policy "Users can update friendship status" on public.friendships
  for update to authenticated
  using (auth.uid() = friend_id)                       -- 只有被请求方能接受
  with check (auth.uid() = friend_id and status = 'accepted');

create policy "Users can delete own friendships" on public.friendships
  for delete to authenticated
  using (auth.uid() = user_id or auth.uid() = friend_id);

create or replace function public.friendships_keys_immutable()
returns trigger language plpgsql set search_path = public as $$
begin
  if NEW.user_id <> OLD.user_id or NEW.friend_id <> OLD.friend_id then
    raise exception 'friendship_keys_immutable' using errcode = '42501';
  end if;
  return NEW;
end $$;

drop trigger if exists friendships_keys_immutable on public.friendships;
create trigger friendships_keys_immutable
  before update on public.friendships
  for each row execute function public.friendships_keys_immutable();

-- ── 2. reactions:只能看到 / 操作自己看得见的打卡上的反应 ─────────
-- 子查询走 practice_logs 自己的 RLS(本人 + 已接受好友),不会递归
drop policy if exists "Anyone can view reactions" on public.reactions;
create policy "View reactions on visible logs" on public.reactions
  for select to authenticated
  using (exists (select 1 from public.practice_logs pl where pl.id = practice_log_id));

drop policy if exists "Users can insert own reactions" on public.reactions;
create policy "Users can insert own reactions" on public.reactions
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.practice_logs pl where pl.id = practice_log_id)
  );

-- ── 3. user_stats / streak_leaderboard 不对匿名开放 ──────────────
drop policy if exists "user_stats_select_all" on public.user_stats;
create policy "user_stats_select_authenticated" on public.user_stats
  for select to authenticated using (true);

revoke all on public.streak_leaderboard from anon;

-- ── 4. coach_waitlist:不能冒用别人的 user_id ───────────────────
drop policy if exists "Insert own waitlist entry" on public.coach_waitlist;
create policy "Insert own waitlist entry" on public.coach_waitlist
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
