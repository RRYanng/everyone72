-- ============================================================
-- 修复 "Database error saving new user" 错误
-- 根因：auth.users 上的触发器 init_user_stats 被 RLS 拦截
--
-- 在 Supabase Dashboard → SQL Editor 中执行此文件
-- ============================================================


-- ── 修复 1：重建触发器函数，加 EXCEPTION 兜底 + 显式绕过 RLS ──────
--
-- 问题：注册时 auth.uid() = NULL，RLS 策略 "auth.uid() = user_id"
--      返回 NULL（非 TRUE），INSERT 被拒绝，触发器抛异常，注册失败。
--
-- 修复：
--   a) SECURITY DEFINER + SET search_path 确保以 postgres 权限运行
--   b) EXCEPTION WHEN OTHERS → 即使插入失败也不阻断注册流程
--   c) 触发器只负责初始化，实际数据由打卡时 upsert 写入

CREATE OR REPLACE FUNCTION public.init_user_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 用 service_role 权限绕过 RLS，直接插入
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 即使 user_stats 插入失败，也不能阻断 auth.users 的 INSERT
    -- 用户注册成功，user_stats 会在首次打卡时通过 upsert 补充创建
    RAISE WARNING '[init_user_stats] skipped for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 确保触发器存在（幂等）
DROP TRIGGER IF EXISTS on_auth_user_created_stats ON auth.users;
CREATE TRIGGER on_auth_user_created_stats
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.init_user_stats();


-- ── 修复 2：拆分 user_stats 的 RLS 策略 ─────────────────────────
--
-- 问题：原策略 "FOR ALL USING (...)" 会同时作为 INSERT 的 WITH CHECK。
--      触发器执行时 auth.uid() = NULL，INSERT 被拒绝。
--
-- 修复：分开写每个操作的策略；INSERT 额外允许 service_role

DROP POLICY IF EXISTS "user_stats_own_write" ON public.user_stats;

-- 普通用户只能插入自己的行；service_role（触发器）可以插入任意行
CREATE POLICY "user_stats_insert"
  ON public.user_stats
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR current_setting('role') = 'service_role'
  );

-- 只能更新自己的行
CREATE POLICY "user_stats_update"
  ON public.user_stats
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 只能删除自己的行
CREATE POLICY "user_stats_delete"
  ON public.user_stats
  FOR DELETE
  USING (auth.uid() = user_id);


-- ── 修复 3：profiles.username 允许 NULL，避免未来约束错误 ──────────
--
-- 原字段：username text NOT NULL（没有 DEFAULT）
-- 如果任何自动化流程尝试创建 profile 时没有传 username，会失败。
-- 修复：允许 NULL，前端代码负责传入真实 username。

ALTER TABLE public.profiles
  ALTER COLUMN username DROP NOT NULL;


-- ── 修复 4：为已有用户补充 user_stats 行 ─────────────────────────
-- 如果之前注册的用户因触发器失败而没有 user_stats 行，在这里补充

INSERT INTO public.user_stats (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;


-- ── 验证（执行后可查看结果）────────────────────────────────────────
-- 查看触发器是否存在
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth';

-- 查看 user_stats 的所有 RLS 策略
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_stats';
