-- ============================================================
-- Auth 修复补丁
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================================

-- ── 1. 允许已登录用户读取其他用户的 username（排行榜需要）────────
-- 删除旧的仅自己可读策略，改为所有已登录用户可读 username
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── 2. 为已有用户补全缺失的 profiles 行（邮箱验证已关闭前注册的用户）
-- 如果有用户注册了但 profile 没有创建成功，用下面语句手动补充
-- （需要 service role 权限，在 SQL Editor 中执行时有该权限）
-- INSERT INTO public.profiles (id, username, email)
-- SELECT id, split_part(email, '@', 1), email
-- FROM auth.users
-- WHERE id NOT IN (SELECT id FROM public.profiles)
-- ON CONFLICT (id) DO NOTHING;
-- 取消注释上面 5 行如需补全已有用户的 profile
