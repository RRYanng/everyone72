-- ============================================================
-- Everyone 72 — 记分卡草稿跨设备同步表
-- 第二层防护：localStorage/AsyncStorage 之外，再把草稿同步到云端，
-- 支持换设备继续填。
--
-- 在 Supabase Dashboard > SQL Editor 中运行此文件。
-- ============================================================

create table if not exists public.scorecard_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 不加 courses 外键：courses 是用户提交整轮时才 lazy upsert 的，没有预先 seed。
  -- 新球场首次游玩、尚未提交时，带外键的草稿 upsert 会失败被静默吞掉。
  -- 草稿是临时数据，不需要强引用完整性。
  course_id text not null,
  round_date date not null,
  draft_data jsonb not null,
  updated_at timestamptz not null default now(),
  -- 同一用户 + 同一球场 + 同一天 只保留一份草稿（供 upsert 命中）
  unique (user_id, course_id, round_date)
);

-- 按用户查询草稿的索引
create index if not exists scorecard_drafts_user_idx
  on public.scorecard_drafts (user_id);

-- ============================================================
-- Row Level Security — 用户只能读写自己的草稿
-- ============================================================
alter table public.scorecard_drafts enable row level security;

create policy "Users can view own drafts"
  on public.scorecard_drafts for select
  using (auth.uid() = user_id);

create policy "Users can insert own drafts"
  on public.scorecard_drafts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own drafts"
  on public.scorecard_drafts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own drafts"
  on public.scorecard_drafts for delete
  using (auth.uid() = user_id);
