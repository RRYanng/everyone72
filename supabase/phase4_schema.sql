-- ============================================================
-- Phase 4: Golf Crew + Settings 数据库 Schema
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================================

-- ── 1. crews 表 ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crews (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name         text        NOT NULL,
  description  text        DEFAULT '',
  emoji        text        DEFAULT '⛳',
  creator_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_members  int         DEFAULT 8,
  invite_code  text        UNIQUE NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;

-- 只有 crew 成员可以查看 crew 信息
CREATE POLICY "crew_members_can_view_crew"
  ON public.crews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_members
      WHERE crew_id = crews.id AND user_id = auth.uid()
    )
  );

-- 已登录用户可以创建 crew
CREATE POLICY "authenticated_can_create_crew"
  ON public.crews FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- 创建者可以更新 crew
CREATE POLICY "creator_can_update_crew"
  ON public.crews FOR UPDATE
  USING (auth.uid() = creator_id);

-- 创建者可以删除 crew
CREATE POLICY "creator_can_delete_crew"
  ON public.crews FOR DELETE
  USING (auth.uid() = creator_id);


-- ── 2. crew_members 表 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crew_members (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  crew_id    uuid        NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        DEFAULT 'member',  -- 'owner' | 'member'
  joined_at  timestamptz DEFAULT now(),
  UNIQUE(crew_id, user_id)
);

ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

-- 同一 crew 的成员可以互相看见
CREATE POLICY "crew_members_view_members"
  ON public.crew_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_members cm2
      WHERE cm2.crew_id = crew_members.crew_id AND cm2.user_id = auth.uid()
    )
  );

-- 用户可以加入 crew（INSERT 自己的记录）
CREATE POLICY "user_can_join_crew"
  ON public.crew_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用户可以退出 crew（DELETE 自己的记录）
CREATE POLICY "user_can_leave_crew"
  ON public.crew_members FOR DELETE
  USING (auth.uid() = user_id);


-- ── 3. crew_challenges 表 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crew_challenges (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  crew_id         uuid        NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  created_by      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text        NOT NULL,
  description     text        DEFAULT '',
  challenge_type  text        DEFAULT 'score',  -- 'score'|'practice'|'handicap'
  target_value    numeric,                       -- score: 目标杆数; practice: 次数
  deadline        date,
  is_active       boolean     DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.crew_challenges ENABLE ROW LEVEL SECURITY;

-- crew 成员可以查看挑战
CREATE POLICY "crew_members_view_challenges"
  ON public.crew_challenges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_members
      WHERE crew_id = crew_challenges.crew_id AND user_id = auth.uid()
    )
  );

-- crew 成员可以创建挑战
CREATE POLICY "crew_member_create_challenge"
  ON public.crew_challenges FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.crew_members
      WHERE crew_id = crew_challenges.crew_id AND user_id = auth.uid()
    )
  );

-- 创建者可以关闭挑战
CREATE POLICY "challenge_creator_update"
  ON public.crew_challenges FOR UPDATE
  USING (auth.uid() = created_by);


-- ── 4. 索引 ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_crew_members_crew_id   ON public.crew_members(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_user_id   ON public.crew_members(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_challenges_crew_id ON public.crew_challenges(crew_id);
CREATE INDEX IF NOT EXISTS idx_crews_invite_code       ON public.crews(invite_code);


-- ── 5. 验证 ──────────────────────────────────────────────────
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('crews', 'crew_members', 'crew_challenges')
ORDER BY tablename;
