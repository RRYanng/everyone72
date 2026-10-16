-- ============================================================
-- 让约局留言板能实时推送:把 outing_comments 加进 supabase_realtime 发布。
--
-- 线上是否已经在发布里无法从 schema 导出确认(导出不含发布),所以写成可重复执行:
--   * 发布不存在 → 跳过(本地裸 Postgres 等没有该发布的环境)
--   * 表已经在发布里 → 跳过(重复执行、或者你已在 Dashboard 手动开过)
--   * 否则加入
-- Realtime 会按订阅者自己的 RLS 过滤事件,所以这不会让用户收到看不到的留言
-- (本地用第二个账号订阅验证过:能收到同城局的留言,收不到异地局的)。
-- ============================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'outing_comments'
     )
  then
    alter publication supabase_realtime add table public.outing_comments;
  end if;
end $$;
