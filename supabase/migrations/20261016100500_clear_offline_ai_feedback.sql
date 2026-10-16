-- ============================================================
-- 数据清理:旧版客户端在 AI 调用失败时会退回本地模板,并把模板当成分析结果
-- 写进 rounds.ai_feedback,于是这些轮次永远显示固定文案。
-- 模板末尾有固定标记 "AI Coach (web preview mode)"。把这些清空后,
-- 用户下次打开该轮的分析页会重新向 AI 请求真正的分析。
-- 只清空带该标记的行;真实的 AI 分析不受影响。
-- ============================================================
update public.rounds
   set ai_feedback = null
 where ai_feedback like '%AI Coach (web preview mode)%';
