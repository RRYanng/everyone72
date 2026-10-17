-- ============================================================
-- 编辑 / 删除已保存的成绩
--
-- 现状:rounds 没有 DELETE 策略、hole_scores 没有 UPDATE/DELETE 策略,所以用户既删不掉
-- 也改不了已保存的成绩。另外 rounds 的 UPDATE 策略允许客户端改任意列(包括把 total_strokes
-- 改成和逐洞数据对不上的值),这和 save_round() "总杆由服务端汇总" 的原则矛盾。
--
-- 做法:
--   * update_round():服务端校验 + 重新汇总总杆 / 推杆 / 相对标准杆,清空过期的 AI 分析
--   * delete_round():删成绩的同时清理它生成的练习计划,并恢复之前生效的那份计划
--   * 不给客户端开放 hole_scores 的直接写权限,也不加 rounds 的 DELETE 策略 ——
--     所有写入都只能经过上面两个函数(它们 SECURITY DEFINER,并显式校验归属)
--   * rounds 的 UPDATE 收窄到只能改 ai_feedback 这一列(客户端保存 AI 分析时需要)
-- ============================================================

-- ── 1. update_round ──────────────────────────────────────────
-- 只允许改:每洞的杆数 / 推杆 / 障碍,以及发球台。不能改球场、洞数、每洞标准杆、日期。
create or replace function public.update_round(
  p_round_id uuid,
  p_tee_box  text,
  p_holes    jsonb      -- [{hole_number, strokes, putts, troubles: [...]}, ...] 必须覆盖该轮的每一洞
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid       uuid := auth.uid();
  v_holes     int;      -- 这一轮实际有几洞(数库里的 hole_scores)
  v_given     int;
  v_valid     boolean;
  v_distinct  int;
  v_matched   int;
  v_strokes   int;
  v_putts     int;
  v_par       int;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- 只能改自己的成绩;锁住这一行避免并发的两次编辑互相覆盖
  perform 1 from public.rounds where id = p_round_id and user_id = v_uid for update;
  if not found then
    raise exception 'round_not_found' using errcode = 'PT404';
  end if;

  if p_holes is null or jsonb_typeof(p_holes) <> 'array' then
    raise exception 'invalid_holes' using errcode = '22023';
  end if;
  v_given := jsonb_array_length(p_holes);
  select count(*) into v_holes from public.hole_scores where round_id = p_round_id;
  if v_given <> v_holes then
    raise exception 'invalid_holes' using errcode = '22023';       -- 洞数不能变
  end if;

  -- 一次聚合完成逐洞校验;缺字段的洞一律判为不合法(bool_and 会忽略 NULL,所以先 coalesce)
  select
    coalesce(bool_and(coalesce(
      hole_number between 1 and 18
      and strokes between 1 and 20
      and putts   between 0 and 10 and putts <= strokes
      and coalesce(troubles, '{}') <@ array['water','ob','bunker','rough','other'],
      false)), false),
    count(distinct hole_number)
  into v_valid, v_distinct
  from jsonb_to_recordset(p_holes)
    as x(hole_number int, strokes int, putts int, troubles text[]);
  if not v_valid or v_distinct <> v_holes then
    raise exception 'invalid_holes' using errcode = '22023';
  end if;

  -- 提交的每一洞都必须是这一轮已有的洞(防止改洞号、漏洞、塞新洞)
  select count(*) into v_matched
    from jsonb_to_recordset(p_holes) as x(hole_number int, strokes int, putts int, troubles text[])
    join public.hole_scores h on h.round_id = p_round_id and h.hole_number = x.hole_number;
  if v_matched <> v_holes then
    raise exception 'invalid_holes' using errcode = '22023';
  end if;

  update public.hole_scores h
     set strokes  = x.strokes,
         putts    = x.putts,
         troubles = coalesce(x.troubles, '{}')
    from jsonb_to_recordset(p_holes) as x(hole_number int, strokes int, putts int, troubles text[])
   where h.round_id = p_round_id and h.hole_number = x.hole_number;

  -- 总杆 / 推杆 / 相对标准杆由服务端按库里的逐洞数据重新汇总(标准杆用库里的,不信客户端)
  select sum(strokes), sum(putts), sum(par) into v_strokes, v_putts, v_par
    from public.hole_scores where round_id = p_round_id;

  update public.rounds
     set total_strokes = v_strokes,
         total_putts   = v_putts,
         score_vs_par  = v_strokes - v_par,
         tee_box       = coalesce(nullif(left(btrim(p_tee_box), 20), ''), tee_box),
         ai_feedback   = null            -- 旧的分析基于旧成绩,已过期;下次打开分析页会重新生成
   where id = p_round_id;
end $$;

-- ── 2. delete_round ──────────────────────────────────────────
create or replace function public.delete_round(p_round_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid           uuid := auth.uid();
  v_was_active    boolean;
  v_first_plan_at timestamptz;
  v_prev_plan     uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  perform 1 from public.rounds where id = p_round_id and user_id = v_uid for update;
  if not found then
    raise exception 'round_not_found' using errcode = 'PT404';
  end if;

  -- 这一轮生成过的练习计划(编辑后重新生成的话可能不止一条)
  select coalesce(bool_or(is_active), false), min(created_at)
    into v_was_active, v_first_plan_at
    from public.practice_plans
   where round_id = p_round_id and user_id = v_uid;

  -- practice_plans.round_id 是 ON DELETE SET NULL,不先删会留下没有来源的孤儿计划
  delete from public.practice_plans where round_id = p_round_id and user_id = v_uid;
  delete from public.rounds where id = p_round_id and user_id = v_uid;    -- hole_scores 随之级联删除

  -- 如果被删的是"当前生效"的计划,恢复它之前最近的一份(保存新计划时应用会把旧的停用)
  if v_was_active then
    select id into v_prev_plan
      from public.practice_plans
     where user_id = v_uid and created_at < v_first_plan_at
     order by created_at desc limit 1;
    if v_prev_plan is not null then
      update public.practice_plans set is_active = (id = v_prev_plan)
       where user_id = v_uid and (id = v_prev_plan or is_active);
    end if;
  end if;
end $$;

revoke execute on function public.update_round(uuid, text, jsonb) from public, anon;
revoke execute on function public.delete_round(uuid)              from public, anon;
grant  execute on function public.update_round(uuid, text, jsonb) to authenticated;
grant  execute on function public.delete_round(uuid)              to authenticated;

-- ── 3. 加固:rounds 只允许客户端直接改 ai_feedback ─────────────
-- (客户端唯一的直接 UPDATE 是保存 AI 分析;其他列都经由 save_round / update_round)
revoke update on public.rounds from authenticated;
grant  update (ai_feedback) on public.rounds to authenticated;
