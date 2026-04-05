-- ============================================================
-- Everyone 72 — Supabase 数据库建表语句
-- 在 Supabase Dashboard > SQL Editor 中运行此文件
-- ============================================================

-- 1. 用户资料表（补充 Supabase Auth 的内置 users 表）
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text,
  avatar_url text,
  handicap numeric(4,1),
  years_playing int,
  created_at timestamptz default now()
);

-- 2. 球场表
create table if not exists public.courses (
  id text primary key,         -- 使用我们 seed data 的 slug id
  name text not null,
  city text,
  state text,
  course_rating numeric(4,1),
  slope_rating int,
  total_par int default 72,
  created_at timestamptz default now()
);

-- 3. 一轮成绩表
create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id),
  date date,
  tee_box text,
  total_holes int default 18,
  total_strokes int,
  total_putts int,
  score_vs_par int,
  ai_feedback text,
  created_at timestamptz default now()
);

-- 4. 每洞成绩表
create table if not exists public.hole_scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  hole_number int not null,
  par int not null,
  strokes int not null,
  putts int not null default 0
);

-- ============================================================
-- Row Level Security (RLS) — 数据安全策略
-- 确保用户只能读写自己的数据
-- ============================================================

-- profiles: 用户只能读写自己的资料
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- courses: 所有登录用户可读，只有 service role 可写（前端通过 upsert 写入）
alter table public.courses enable row level security;

create policy "Anyone can read courses"
  on public.courses for select
  using (true);

create policy "Authenticated users can upsert courses"
  on public.courses for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update courses"
  on public.courses for update
  using (auth.role() = 'authenticated');

-- rounds: 用户只能读写自己的轮次
alter table public.rounds enable row level security;

create policy "Users can view own rounds"
  on public.rounds for select
  using (auth.uid() = user_id);

create policy "Users can insert own rounds"
  on public.rounds for insert
  with check (auth.uid() = user_id);

create policy "Users can update own rounds"
  on public.rounds for update
  using (auth.uid() = user_id);

-- hole_scores: 通过 round 关联到用户
alter table public.hole_scores enable row level security;

create policy "Users can view own hole scores"
  on public.hole_scores for select
  using (
    exists (
      select 1 from public.rounds
      where rounds.id = hole_scores.round_id
        and rounds.user_id = auth.uid()
    )
  );

create policy "Users can insert own hole scores"
  on public.hole_scores for insert
  with check (
    exists (
      select 1 from public.rounds
      where rounds.id = hole_scores.round_id
        and rounds.user_id = auth.uid()
    )
  );

-- ============================================================
-- 索引优化
-- ============================================================
create index if not exists idx_rounds_user_id on public.rounds(user_id);
create index if not exists idx_rounds_created_at on public.rounds(created_at desc);
create index if not exists idx_hole_scores_round_id on public.hole_scores(round_id);
