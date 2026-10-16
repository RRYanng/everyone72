-- ============================================================
-- P0: public_profiles —— 让登录用户能读到"别人的公开资料",但读不到邮箱
--
-- 线上现状:profiles 只有 "Users can view own profile"(fix_auth.sql 从未执行),
-- 所以排行榜 / 好友搜索 / 约局成员名 / Crew 成员名读别人的 username 全是空。
-- 直接放开 profiles 的 SELECT 会连 email 一起暴露,所以用视图只暴露公开列。
--
-- 视图以 owner(postgres)权限运行,绕过 profiles 的 RLS —— 这是有意为之,
-- 暴露面完全由下面的列清单和 GRANT 决定(Supabase advisor 会提示 security
-- definer view,可忽略)。
--
-- 公开列:id, username, avatar_url, handicap, years_playing, city,
--         home_course_id, bio    (约局详情页的发起人资料卡会用到)
-- 不公开:email, availability, created_at
-- ============================================================
create or replace view public.public_profiles as
  select id, username, avatar_url, handicap, years_playing, city, home_course_id, bio
  from public.profiles;

revoke all on public.public_profiles from public, anon, authenticated;
grant select on public.public_profiles to authenticated;

comment on view public.public_profiles is
  'Publicly visible subset of profiles (no email). Intentionally bypasses profiles RLS.';
