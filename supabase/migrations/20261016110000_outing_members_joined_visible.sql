-- ============================================================
-- 修复 20261016100000 引入的回归:非成员看不到"已加入"的成员
--
-- 浏览器端到端测试发现:同城但还没加入的用户打开约局列表 / 详情,
-- 人数显示 0/2、"已加入(0)",而发起人其实已占 1 个名额(见 e2e 报告)。
-- 原因是 outing_members 的 SELECT 只允许 本人 / 发起人 / 该局成员 读取,
-- 列表页统计人数、详情页展示"已加入"名单都要读别人的成员行。
--
-- 新规则:
--   * 本人的行、发起人名下的行(含 pending):照旧
--   * status = 'joined' 的行:任何"能看到这个局"的人都可读(发起人 / 成员 / 同城)
--   * 别人的 pending 申请:仍然只有申请人本人和发起人看得到
-- ============================================================
drop policy if exists "read members (organizer or member)" on public.outing_members;

create policy "read members (self, organizer, or joined of a visible outing)"
  on public.outing_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_outing_organizer(outing_id)
    or (status = 'joined' and public.can_see_outing(outing_id))
  );
