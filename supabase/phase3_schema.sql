-- ============================================================
-- Phase 3: AI 练习计划 + Trouble 洞察 + Streak 勋章系统
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================================

-- ── 1. 练习计划表 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS practice_plans (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  round_id    uuid        REFERENCES rounds(id) ON DELETE SET NULL,
  plan_text   text        NOT NULL,
  week_start  date        NOT NULL DEFAULT CURRENT_DATE,
  is_active   boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE practice_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practice_plans_own" ON practice_plans
  FOR ALL USING (auth.uid() = user_id);

-- ── 2. practice_logs 增加 following_plan 字段 ────────────────
ALTER TABLE practice_logs
  ADD COLUMN IF NOT EXISTS following_plan boolean DEFAULT false;

-- ── 3. 用户统计表（streak + 勋章） ─────────────────────────────
CREATE TABLE IF NOT EXISTS user_stats (
  user_id             uuid        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  current_streak      int         DEFAULT 0,
  longest_streak      int         DEFAULT 0,
  total_practices     int         DEFAULT 0,
  last_practice_date  date,
  ai_plans_completed  int         DEFAULT 0,
  badges              jsonb       DEFAULT '[]'::jsonb,
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- 查看所有人 streak（排行榜需要）
CREATE POLICY "user_stats_select_all" ON user_stats
  FOR SELECT USING (true);

-- 只能修改自己的
CREATE POLICY "user_stats_own_write" ON user_stats
  FOR ALL USING (auth.uid() = user_id);

-- ── 4. 用于 Streak 排行榜的视图 ─────────────────────────────────
CREATE OR REPLACE VIEW streak_leaderboard AS
  SELECT
    us.user_id,
    p.username,
    us.current_streak,
    us.longest_streak,
    us.total_practices,
    us.badges
  FROM user_stats us
  LEFT JOIN profiles p ON p.id = us.user_id
  WHERE us.current_streak > 0
  ORDER BY us.current_streak DESC;

-- ── 5. 初始化当前用户的统计行（如不存在）─────────────────────────
-- 执行后再打卡会自动 upsert，这里只是预置触发器
CREATE OR REPLACE FUNCTION init_user_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 新用户注册时自动创建 user_stats 行
DROP TRIGGER IF EXISTS on_auth_user_created_stats ON auth.users;
CREATE TRIGGER on_auth_user_created_stats
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION init_user_stats();

-- ── 6. 为已有用户补充 user_stats 行 ─────────────────────────────
INSERT INTO user_stats (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
