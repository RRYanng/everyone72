-- ============================================================
-- P2: 连续打卡 streak 和勋章改由服务端计算(防排行榜作弊)
--
-- 之前:客户端读 user_stats、自己算 streak / badges、再 upsert 回去,
-- 而 user_stats 对本人完全可写 —— 任何人用一条 REST 请求就能把自己的
-- current_streak 改成 9999,并出现在所有人看到的排行榜(streak_leaderboard)第一名。
--
-- 现在:
--   * practice_logs 新增 local_date(打卡当天的本地日期,客户端传,服务端夹到 UTC 日期 ±1 天内,
--     所以不可能伪造出比真实时间更多的天数)
--   * 每次插入 practice_logs,触发器调用 apply_practice_day() 更新 user_stats
--     (规则和之前客户端完全一致:同一天不重复计;隔一天 +1;断了重置为 1;解锁勋章)
--   * user_stats 对客户端只读(只有 SELECT):不能 insert / update / delete
--   * 一次性按现有打卡记录重放,把所有人的统计校正为服务端结果
-- ============================================================

-- ── 1. practice_logs.local_date ─────────────────────────────
alter table public.practice_logs add column if not exists local_date date;
update public.practice_logs
   set local_date = (created_at at time zone 'utc')::date
 where local_date is null;
alter table public.practice_logs alter column local_date set default ((now() at time zone 'utc')::date);
alter table public.practice_logs alter column local_date set not null;

-- 客户端给的日期必须在服务端 UTC 日期的前后一天以内,否则按服务端日期算
create or replace function public.practice_logs_clamp_local_date()
returns trigger language plpgsql as $$
declare v_today date := (now() at time zone 'utc')::date;
begin
  if new.local_date is null or abs(new.local_date - v_today) > 1 then
    new.local_date := v_today;
  end if;
  return new;
end $$;

drop trigger if exists practice_logs_clamp_local_date on public.practice_logs;
create trigger practice_logs_clamp_local_date
  before insert on public.practice_logs
  for each row execute function public.practice_logs_clamp_local_date();

-- ── 2. 计算规则(只有触发器和下面的校正会调用,客户端不能直接调用)────
create or replace function public.apply_practice_day(
  p_user uuid, p_day date, p_now timestamptz default now()
) returns void
language plpgsql security definer set search_path = public as $$
declare
  s        public.user_stats;
  v_streak int;
  v_total  int;
  v_badges jsonb;
  d        record;
begin
  insert into public.user_stats (user_id) values (p_user) on conflict (user_id) do nothing;
  select * into s from public.user_stats where user_id = p_user for update;

  -- 这一天(或更早的日子)已经计过了:不重复计
  if s.last_practice_date is not null and p_day <= s.last_practice_date then
    return;
  end if;

  v_streak := case
    when s.last_practice_date is not null and p_day - s.last_practice_date = 1
      then coalesce(s.current_streak, 0) + 1
    else 1
  end;
  v_total  := coalesce(s.total_practices, 0) + 1;
  v_badges := coalesce(s.badges, '[]'::jsonb);

  -- 勋章定义(和 src/lib/streak.ts 的 BADGE_DEFS 保持一致)
  for d in
    select * from (values
      ('streak_3',      '🔥', '3-Day Streak',           v_streak >= 3),
      ('streak_7',      '⚡', '7-Day Streak',           v_streak >= 7),
      ('streak_30',     '🏆', '30-Day Streak',          v_streak >= 30),
      ('plans_10',      '🎯', '10 AI Plans Completed',  coalesce(s.ai_plans_completed, 0) >= 10),
      ('practices_100', '💪', '100 Practice Sessions',  v_total >= 100)
    ) as t(id, emoji, label, earned)
  loop
    if d.earned and not exists (
      select 1 from jsonb_array_elements(v_badges) b where b ->> 'id' = d.id
    ) then
      v_badges := v_badges || jsonb_build_array(jsonb_build_object(
        'id', d.id, 'emoji', d.emoji, 'label', d.label, 'earned_at', p_now));
    end if;
  end loop;

  update public.user_stats
     set current_streak     = v_streak,
         longest_streak     = greatest(v_streak, coalesce(longest_streak, 0)),
         total_practices    = v_total,
         last_practice_date = p_day,
         badges             = v_badges,
         updated_at         = p_now
   where user_id = p_user;
end $$;

revoke execute on function public.apply_practice_day(uuid, date, timestamptz) from public, anon, authenticated;

create or replace function public.practice_logs_apply_stats()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.apply_practice_day(new.user_id, new.local_date);
  return new;
end $$;

drop trigger if exists practice_logs_apply_stats on public.practice_logs;
create trigger practice_logs_apply_stats
  after insert on public.practice_logs
  for each row execute function public.practice_logs_apply_stats();

-- ── 3. user_stats 对客户端只读 ──────────────────────────────
drop policy if exists "user_stats_update" on public.user_stats;
drop policy if exists "user_stats_delete" on public.user_stats;
drop policy if exists "user_stats_insert" on public.user_stats;
revoke all on public.user_stats from anon, authenticated;
grant select on public.user_stats to authenticated;     -- 首页 / 排行榜读取,仍受 SELECT 策略约束

-- ── 4. 一次性校正:按现有打卡记录重放,覆盖客户端写进去的任何数值 ──
-- (ai_plans_completed 保留:目前没有任何功能会产生它,值为 0)
do $$
declare r record;
begin
  update public.user_stats
     set current_streak = 0, longest_streak = 0, total_practices = 0,
         last_practice_date = null, badges = '[]'::jsonb, updated_at = now();

  for r in
    select user_id, local_date
      from (select distinct user_id, local_date from public.practice_logs) x
     order by user_id, local_date
  loop
    perform public.apply_practice_day(r.user_id, r.local_date);
  end loop;
end $$;
