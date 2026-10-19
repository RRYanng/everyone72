-- ============================================================
-- 数据修正(一次性,不是 schema 迁移):校正 4 个球场上已保存成绩的每洞标准杆
--
-- 背景:Pebble Beach、Pelican Hill Ocean North / South、PGA West Stadium 这 4 个球场
-- 曾经不在应用的球场列表里,旧成绩里存的每洞标准杆来自当时未经核实的数据,和官方记分卡不一致
-- (Ocean South 的总标准杆更是 70,不是 71)。courses.holes_par 现在是按官方记分卡核实过的正确值。
--
-- 做什么:
--   1. hole_scores.par     ← courses.holes_par[hole_number](只改这 4 个球场、18 洞成绩里不一致的洞)
--   2. rounds.score_vs_par ← total_strokes − 该场各洞标准杆之和(只改算出来不同的场次)
--
-- 不做什么:不碰 strokes / putts / troubles / ai_feedback / practice_plans / total_strokes / total_putts。
--
-- 安全:整段是一个 DO 语句 = 一个事务。执行前记下每场的杆数和推杆数,执行后逐场对比,
-- 任何一场的杆数或推杆变了、或洞数变了,就整体回滚(RAISE EXCEPTION)。可重复执行:第二次什么都不会改。
-- ============================================================
do $$
declare
  c_courses constant text[] := array['pebble-beach', 'pelican-hill-north', 'pelican-hill-south', 'pga-west-stadium'];
  n_holes_changed  int;
  n_rounds_changed int;
begin
  create temp table _before on commit drop as
    select r.id,
           r.total_strokes, r.total_putts,
           (select sum(h.strokes) from hole_scores h where h.round_id = r.id) as sum_strokes,
           (select sum(h.putts)   from hole_scores h where h.round_id = r.id) as sum_putts,
           (select count(*)       from hole_scores h where h.round_id = r.id) as n_holes
      from rounds r
     where r.course_id = any (c_courses) and r.total_holes = 18;

  -- 1. 每洞标准杆
  update hole_scores h
     set par = c.holes_par[h.hole_number]
    from rounds r
    join courses c on c.id = r.course_id
   where h.round_id = r.id
     and r.course_id = any (c_courses)
     and r.total_holes = 18
     and c.holes_par is not null
     and h.par is distinct from c.holes_par[h.hole_number];
  get diagnostics n_holes_changed = row_count;

  -- 2. 相对标准杆(只处理 18 洞全在的场次)
  update rounds r
     set score_vs_par = r.total_strokes - (select sum(h.par) from hole_scores h where h.round_id = r.id)
   where r.course_id = any (c_courses)
     and r.total_holes = 18
     and (select count(*) from hole_scores h where h.round_id = r.id) = 18
     and r.score_vs_par is distinct from
         r.total_strokes - (select sum(h.par) from hole_scores h where h.round_id = r.id);
  get diagnostics n_rounds_changed = row_count;

  -- 3. 校验:杆数、推杆、洞数一个都不能变;每场 vs-par 必须等于 杆数 − 标准杆之和
  if exists (
    select 1 from _before b join rounds r on r.id = b.id
     where r.total_strokes is distinct from b.total_strokes
        or r.total_putts   is distinct from b.total_putts
  ) then
    raise exception 'abort: a round''s total strokes/putts changed';
  end if;
  if exists (
    select 1 from _before b
     where b.sum_strokes is distinct from (select sum(h.strokes) from hole_scores h where h.round_id = b.id)
        or b.sum_putts   is distinct from (select sum(h.putts)   from hole_scores h where h.round_id = b.id)
        or b.n_holes     is distinct from (select count(*)       from hole_scores h where h.round_id = b.id)
  ) then
    raise exception 'abort: hole-level strokes/putts/count changed';
  end if;
  if exists (
    select 1 from rounds r
     where r.course_id = any (c_courses) and r.total_holes = 18
       and (select count(*) from hole_scores h where h.round_id = r.id) = 18
       and r.score_vs_par is distinct from r.total_strokes - (select sum(h.par) from hole_scores h where h.round_id = r.id)
  ) then
    raise exception 'abort: score_vs_par is inconsistent after the fix';
  end if;
  if exists (
    select 1 from hole_scores h join rounds r on r.id = h.round_id join courses c on c.id = r.course_id
     where r.course_id = any (c_courses) and r.total_holes = 18 and c.holes_par is not null
       and h.par is distinct from c.holes_par[h.hole_number]
  ) then
    raise exception 'abort: some holes still disagree with courses.holes_par';
  end if;

  raise notice 'fixed % hole rows and % round rows', n_holes_changed, n_rounds_changed;
end $$;

-- 结果(只读):每场的最终状态
select r.date, c.name as course, r.total_strokes as strokes, r.total_putts as putts,
       (select sum(h.par) from hole_scores h where h.round_id = r.id) as par_total,
       r.score_vs_par as vs_par
  from rounds r join courses c on c.id = r.course_id
 where r.course_id in ('pebble-beach', 'pelican-hill-north', 'pelican-hill-south', 'pga-west-stadium')
   and r.total_holes = 18
 order by c.name, r.date;
