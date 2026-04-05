-- ============================================================
-- Phase 4: Golf Crew + Settings 数据库 Schema
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================================

-- 1. 先建所有表（不带 policy）
CREATE TABLE IF NOT EXISTS public.crews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  emoji text DEFAULT '⛳',
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_members int DEFAULT 8,
  invite_code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crew_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  crew_id uuid NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(crew_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.crew_challenges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  crew_id uuid NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  challenge_type text DEFAULT 'score',
  target_value numeric,
  deadline date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. 启用 RLS
ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_challenges ENABLE ROW LEVEL SECURITY;

-- 3. crews policies
CREATE POLICY "crew_members_can_view_crew" ON public.crews FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.crew_members WHERE crew_id = crews.id AND user_id = auth.uid()));
CREATE POLICY "authenticated_can_create_crew" ON public.crews FOR INSERT
  WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "creator_can_update_crew" ON public.crews FOR UPDATE
  USING (auth.uid() = creator_id);
CREATE POLICY "creator_can_delete_crew" ON public.crews FOR DELETE
  USING (auth.uid() = creator_id);

-- 4. crew_members policies
-- 注意：使用 security definer 函数避免自引用 RLS 递归
CREATE OR REPLACE FUNCTION public.is_crew_member(p_crew_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crew_members
    WHERE crew_id = p_crew_id AND user_id = auth.uid()
  );
$$;

CREATE POLICY "crew_members_view_members" ON public.crew_members FOR SELECT
  USING (public.is_crew_member(crew_id));
CREATE POLICY "user_can_join_crew" ON public.crew_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_can_leave_crew" ON public.crew_members FOR DELETE
  USING (auth.uid() = user_id);

-- 5. crew_challenges policies
CREATE POLICY "crew_members_view_challenges" ON public.crew_challenges FOR SELECT
  USING (public.is_crew_member(crew_id));
CREATE POLICY "crew_member_create_challenge" ON public.crew_challenges FOR INSERT
  WITH CHECK (auth.uid() = created_by AND public.is_crew_member(crew_id));
CREATE POLICY "challenge_creator_update" ON public.crew_challenges FOR UPDATE
  USING (auth.uid() = created_by);

-- 6. 索引
CREATE INDEX IF NOT EXISTS idx_crew_members_crew_id    ON public.crew_members(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_user_id    ON public.crew_members(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_challenges_crew_id ON public.crew_challenges(crew_id);
CREATE INDEX IF NOT EXISTS idx_crews_invite_code       ON public.crews(invite_code);

-- 7. 验证
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('crews', 'crew_members', 'crew_challenges')
ORDER BY tablename;
