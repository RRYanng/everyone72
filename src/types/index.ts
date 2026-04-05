// ============================================================
// 全局类型定义
// ============================================================

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  handicap?: number;
  years_playing?: number;
  created_at: string;
}

// 球场信息
export interface Course {
  id: string;
  name: string;
  city: string;
  state: string;
  course_rating: number;  // 如 72.4
  slope_rating: number;   // 如 133
  total_par: number;       // 通常 72
  holes: HoleInfo[];
}

// 每洞基本信息（来自球场数据库）
export interface HoleInfo {
  hole_number: number;
  par: number;
  handicap_index?: number; // 洞难度排名
}

// 用户打的一轮
export interface Round {
  id: string;
  user_id: string;
  course_id: string;
  course?: Course;
  date: string;
  tee_box?: string;   // 'red' | 'white' | 'blue' | 'gold'
  total_holes: number; // 9 or 18
  total_strokes: number;
  total_putts: number;
  score_vs_par: number;  // 相对 Par 成绩，如 +5
  ai_feedback?: string;
  created_at: string;
  hole_scores?: HoleScore[];
}

// 每洞实际成绩
export interface HoleScore {
  id?: string;
  round_id: string;
  hole_number: number;
  par: number;
  strokes: number;
  putts: number;
  troubles?: string[];  // ['water','ob','bunker','rough','other']
}

// 记录过程中的临时状态（未保存到数据库）
export interface ActiveRound {
  course: Course;
  tee_box: string;
  total_holes: 9 | 18;
  hole_scores: HoleScore[];
  current_hole: number;
}

// AI 分析结果（解析后的结构）
export interface AnalysisResult {
  round_id: string;
  feedback: string;
  created_at: string;
}

// ── Phase 3 新增 ──────────────────────────────────────────────

/** AI 生成的个性化练习计划 */
export interface PracticePlan {
  id: string;
  user_id: string;
  round_id?: string;
  plan_text: string;
  week_start: string;
  is_active: boolean;
  created_at: string;
}

/** 用户统计 — 连续打卡 + 勋章 */
export interface UserStats {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  total_practices: number;
  last_practice_date: string | null;
  ai_plans_completed: number;
  badges: Badge[];
  updated_at: string;
}

export interface Badge {
  id: string;
  emoji: string;
  label: string;
  earned_at: string;
}

/** Trouble 聚合数据 */
export interface TroubleStats {
  water: number;
  ob: number;
  bunker: number;
  rough: number;
  other: number;
  totalRounds: number;
  byPar: { par3: number; par4: number; par5: number };
}
