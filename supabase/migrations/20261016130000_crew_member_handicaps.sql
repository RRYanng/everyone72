-- ============================================================
-- Crew 成员的 Handicap:只暴露一个数字,不暴露任何成绩
--
-- 现状:Crew 页面用客户端直接查 rounds 来算每个成员的 HCP,但 rounds 的 RLS 只让人
-- 读自己的行,所以别人的 HCP 永远是空的(只有自己的有值)。
-- 直接放开 rounds 的 SELECT 会把每个成员的具体成绩都暴露给 Crew 里所有人,不可取。
--
-- 做法:SECURITY DEFINER 函数,在服务端算好 handicap,只返回 (user_id, handicap)。
--   * 调用者必须是该 Crew 的成员,否则返回空集(不报错,不暗示 Crew 是否存在)
--   * 只返回该 Crew 当前成员
--   * 别人只有在至少有 3 轮成绩时才可见 —— 只有 1 轮时 handicap 就等于那一轮的
--     相对标准杆,等于泄露了具体成绩。自己的 HCP 不受这个限制。
--   * 返回的列只有 user_id 和 handicap,看不到任何一轮的杆数 / 推杆 / 日期 / 球场
--
-- 算法必须和客户端 src/lib/roundStats.ts 的 handicap18() 完全一致:
--   最近 20 轮 → 每轮 score_vs_par × 18 ÷ 洞数 → 升序取最好的 min(ceil(n/2), 8) 轮
--   → 求平均 → 四舍五入到 1 位小数(floor(x×10+0.5)/10,与 JS Math.round 同一规则,
--   负数恰好在 .5 上时两边结果也一致)。
-- ============================================================
create or replace function public.crew_member_handicaps(p_crew_id uuid)
returns table (user_id uuid, handicap numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_crew_member(p_crew_id) then
    return;
  end if;

  return query
  with recent as (
    select r.user_id as uid,
           (r.score_vs_par::float8 * 18) / coalesce(nullif(r.total_holes, 0), 18) as diff,
           row_number() over (partition by r.user_id order by r.created_at desc) as rn
      from public.rounds r
     where r.user_id in (select cm.user_id from public.crew_members cm where cm.crew_id = p_crew_id)
       and r.score_vs_par is not null
  ),
  last20 as (select uid, diff from recent where rn <= 20),
  cnt    as (select uid, count(*) as n from last20 group by uid),
  ranked as (
    select l.uid, l.diff, c.n,
           row_number() over (partition by l.uid order by l.diff asc) as rk
      from last20 l join cnt c using (uid)
  )
  select rk.uid,
         (floor(avg(rk.diff) * 10 + 0.5) / 10)::numeric
    from ranked rk
   where rk.rk <= least(ceil(rk.n / 2.0), 8)
     and (rk.n >= 3 or rk.uid = auth.uid())
   group by rk.uid;
end $$;

revoke execute on function public.crew_member_handicaps(uuid) from public, anon;
grant  execute on function public.crew_member_handicaps(uuid) to authenticated;
