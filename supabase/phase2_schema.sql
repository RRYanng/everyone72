-- ============================================================
-- Everyone 72 — Phase 2 新增表
-- 在 Supabase Dashboard > SQL Editor 中运行此文件
-- ============================================================

-- 1. 练球打卡记录表
create table if not exists public.practice_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_url text,                        -- Supabase Storage 的图片 URL
  practice_tags text[] default '{}',     -- ['挥杆','推杆','切杆','沙坑']
  duration_minutes int,                  -- 练习时长（分钟）
  ball_count int,                        -- 打了多少颗球
  note text,                             -- 备注（可选）
  location text,                         -- 练习场名称（可选）
  created_at timestamptz default now()
);

-- 2. 好友关系表
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',  -- 'pending' | 'accepted'
  created_at timestamptz default now(),
  unique(user_id, friend_id)
);

-- 3. 点赞/评论表
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  practice_log_id uuid not null references public.practice_logs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'like',   -- 'like' | 'comment'
  content text,                        -- 评论内容（type='comment' 时使用）
  created_at timestamptz default now(),
  unique(practice_log_id, user_id, type)  -- 每人每条打卡只能点一次赞
);

-- ============================================================
-- Supabase Storage Bucket（练习照片）
-- ============================================================
-- 注意：在 Supabase Dashboard > Storage 手动创建名为 "practice-photos" 的 bucket
-- 设置为 Public bucket（允许公开读取图片 URL）

-- ============================================================
-- RLS 安全策略
-- ============================================================

-- practice_logs
alter table public.practice_logs enable row level security;

create policy "Users can view own and friends practice logs"
  on public.practice_logs for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships
      where status = 'accepted'
        and (
          (user_id = auth.uid() and friend_id = practice_logs.user_id)
          or (friend_id = auth.uid() and user_id = practice_logs.user_id)
        )
    )
  );

create policy "Users can insert own practice logs"
  on public.practice_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own practice logs"
  on public.practice_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete own practice logs"
  on public.practice_logs for delete
  using (auth.uid() = user_id);

-- friendships
alter table public.friendships enable row level security;

create policy "Users can view own friendships"
  on public.friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can insert friend requests"
  on public.friendships for insert
  with check (auth.uid() = user_id);

create policy "Users can update friendship status"
  on public.friendships for update
  using (auth.uid() = friend_id);  -- 只有被请求方能接受

-- reactions
alter table public.reactions enable row level security;

create policy "Anyone can view reactions"
  on public.reactions for select using (true);

create policy "Users can insert own reactions"
  on public.reactions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own reactions"
  on public.reactions for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 索引
-- ============================================================
create index if not exists idx_practice_logs_user_id on public.practice_logs(user_id);
create index if not exists idx_practice_logs_created_at on public.practice_logs(created_at desc);
create index if not exists idx_friendships_user_id on public.friendships(user_id);
create index if not exists idx_friendships_friend_id on public.friendships(friend_id);
create index if not exists idx_reactions_log_id on public.reactions(practice_log_id);
