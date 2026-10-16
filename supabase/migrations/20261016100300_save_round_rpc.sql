-- ============================================================
-- P0: save_round() —— 一整轮成绩在一个事务里保存
--
-- 之前客户端分三步:upsert courses → insert rounds → insert hole_scores,
-- 后两步任何一步失败都不会回滚,且 hole_scores 的错误根本没检查:
-- 失败时用户的草稿已被清空,库里却留下一个没有逐洞数据的 round。
--
-- 另外总杆 / 总推杆 / 相对标准杆之前由客户端传入,服务端不校验,
-- 现在由服务端从逐洞数据汇总,杜绝篡改和前后端不一致。
--
-- SECURITY INVOKER:仍受 RLS 约束(只能写自己的 round)。
-- 球场只在不存在时插入(on conflict do nothing),不会覆盖已有球场的评分,
-- 避免任何登录用户借保存成绩改写球场数据。
-- ============================================================
create or replace function public.save_round(
  p_course   jsonb,   -- {id, name, city, state, course_rating, slope_rating, total_par}
  p_tee_box  text,
  p_date     date,    -- 客户端的本地日期(避免 UTC 在美西傍晚算成"明天")
  p_holes    jsonb    -- [{hole_number, par, strokes, putts, troubles: [...]}, ...]
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_uid      uuid := auth.uid();
  v_n        int;
  v_round    uuid;
  v_strokes  int;
  v_putts    int;
  v_par      int;
  v_valid    boolean;
  v_distinct int;
  v_course   text := nullif(btrim(p_course ->> 'id'), '');
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if v_course is null or length(v_course) > 100 or nullif(btrim(p_course ->> 'name'), '') is null then
    raise exception 'invalid_course' using errcode = '22023';
  end if;
  if p_holes is null or jsonb_typeof(p_holes) <> 'array' then
    raise exception 'invalid_holes' using errcode = '22023';
  end if;

  v_n := jsonb_array_length(p_holes);
  if v_n not in (9, 18) then
    raise exception 'invalid_holes' using errcode = '22023';
  end if;

  -- 一次聚合同时完成逐洞校验和汇总;任何一洞不合法 v_valid 即为 false
  select
    -- bool_and 会忽略 NULL,所以每洞先 coalesce 成 false:缺字段的洞一律判为不合法
    coalesce(bool_and(coalesce(
      hole_number between 1 and 18
      and par     between 3 and 6
      and strokes between 1 and 20
      and putts   between 0 and 10 and putts <= strokes
      and coalesce(troubles, '{}') <@ array['water','ob','bunker','rough','other'],
      false)), false),
    count(distinct hole_number),
    sum(strokes), sum(putts), sum(par)
  into v_valid, v_distinct, v_strokes, v_putts, v_par
  from jsonb_to_recordset(p_holes)
    as x(hole_number int, par int, strokes int, putts int, troubles text[]);

  if not v_valid or v_distinct <> v_n then
    raise exception 'invalid_holes' using errcode = '22023';
  end if;

  insert into public.courses (id, name, city, state, course_rating, slope_rating, total_par)
  values (
    v_course,
    left(p_course ->> 'name', 200),
    left(p_course ->> 'city', 100),
    left(p_course ->> 'state', 50),
    (p_course ->> 'course_rating')::numeric,
    (p_course ->> 'slope_rating')::int,
    coalesce((p_course ->> 'total_par')::int, v_par)
  )
  on conflict (id) do nothing;

  insert into public.rounds
    (user_id, course_id, date, tee_box, total_holes, total_strokes, total_putts, score_vs_par)
  values
    (v_uid, v_course, coalesce(p_date, current_date), left(p_tee_box, 20),
     v_n, v_strokes, v_putts, v_strokes - v_par)
  returning id into v_round;

  insert into public.hole_scores (round_id, hole_number, par, strokes, putts, troubles)
  select v_round, hole_number, par, strokes, putts, coalesce(troubles, '{}')
  from jsonb_to_recordset(p_holes)
    as x(hole_number int, par int, strokes int, putts int, troubles text[]);

  return v_round;
end $$;

revoke execute on function public.save_round(jsonb, text, date, jsonb) from public, anon;
grant  execute on function public.save_round(jsonb, text, date, jsonb) to authenticated;
