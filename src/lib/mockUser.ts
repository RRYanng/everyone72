// ============================================================
// DEV-ONLY mock session & fixture data
//
// 用于 __DEV__ 模式下绕过 Supabase 登录，直接进入主 Tab 做视觉走查。
// 生产构建 (__DEV__ === false) 下 Landing 上的 Skip Login 按钮不会渲染，
// 但这些导出本身没有副作用，可安全打入 bundle。
// ============================================================

import type { Session, User } from '@supabase/supabase-js';
import type { Round, PracticePlan, UserStats, TroubleStats } from '../types';
import type { DiagnosisReport } from './claude';

const MOCK_USER_ID = 'dev-mock-user-0000';

export const MOCK_USER = {
  id: MOCK_USER_ID,
  email: 'dev@everyone72.local',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as unknown as User;

export const MOCK_SESSION = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: MOCK_USER,
} as unknown as Session;

export const MOCK_PROFILE = {
  username: 'Alan',
  avatar_url: '🏌️',
};

const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

export const MOCK_ROUNDS: Round[] = [
  {
    id: 'mock-round-1',
    user_id: MOCK_USER_ID,
    course_id: 'pebble-beach',
    tee_box: 'blue',
    total_holes: 18,
    total_strokes: 78,
    total_putts: 31,
    score_vs_par: 6,
    created_at: daysAgo(2),
    ai_feedback: 'Your short game cost you 4 strokes today...',
    courses: { name: 'Pebble Beach Golf Links', city: 'Pebble Beach', state: 'CA', course_rating: 74.7, slope_rating: 143, total_par: 72 },
  } as any,
  {
    id: 'mock-round-2',
    user_id: MOCK_USER_ID,
    course_id: 'torrey-pines-south',
    tee_box: 'blue',
    total_holes: 18,
    total_strokes: 82,
    total_putts: 34,
    score_vs_par: 10,
    created_at: daysAgo(7),
    courses: { name: 'Torrey Pines South', city: 'La Jolla', state: 'CA', course_rating: 76.9, slope_rating: 145, total_par: 72 },
  } as any,
  {
    id: 'mock-round-3',
    user_id: MOCK_USER_ID,
    course_id: 'bethpage-black',
    tee_box: 'white',
    total_holes: 18,
    total_strokes: 75,
    total_putts: 29,
    score_vs_par: 3,
    created_at: daysAgo(14),
    ai_feedback: '3-putts were the main story...',
    courses: { name: 'Bethpage Black', city: 'Farmingdale', state: 'NY', course_rating: 77.5, slope_rating: 155, total_par: 72 },
  } as any,
  {
    id: 'mock-round-4',
    user_id: MOCK_USER_ID,
    course_id: 'whistling-straits',
    tee_box: 'blue',
    total_holes: 18,
    total_strokes: 85,
    total_putts: 36,
    score_vs_par: 13,
    created_at: daysAgo(21),
    courses: { name: 'Whistling Straits (Straits)', city: 'Kohler', state: 'WI', course_rating: 77.2, slope_rating: 152, total_par: 72 },
  } as any,
  {
    id: 'mock-round-5',
    user_id: MOCK_USER_ID,
    course_id: 'pinehurst-no2',
    tee_box: 'white',
    total_holes: 18,
    total_strokes: 79,
    total_putts: 32,
    score_vs_par: 7,
    created_at: daysAgo(28),
    ai_feedback: 'Driver accuracy dropped on back 9...',
    courses: { name: 'Pinehurst No. 2', city: 'Pinehurst', state: 'NC', course_rating: 76.5, slope_rating: 138, total_par: 72 },
  } as any,
  {
    id: 'mock-round-6',
    user_id: MOCK_USER_ID,
    course_id: 'shadow-creek',
    tee_box: 'blue',
    total_holes: 18,
    total_strokes: 80,
    total_putts: 33,
    score_vs_par: 8,
    created_at: daysAgo(35),
    courses: { name: 'Shadow Creek', city: 'North Las Vegas', state: 'NV', course_rating: 76.4, slope_rating: 147, total_par: 72 },
  } as any,
  {
    id: 'mock-round-7',
    user_id: MOCK_USER_ID,
    course_id: 'kiawah-ocean',
    tee_box: 'white',
    total_holes: 18,
    total_strokes: 88,
    total_putts: 37,
    score_vs_par: 16,
    created_at: daysAgo(45),
    courses: { name: 'Kiawah Island (Ocean)', city: 'Kiawah Island', state: 'SC', course_rating: 76.8, slope_rating: 151, total_par: 72 },
  } as any,
];

export const MOCK_ACTIVE_PLAN: PracticePlan = {
  id: 'mock-plan-1',
  user_id: MOCK_USER_ID,
  is_active: true,
  // 真实 Claude 返回格式（带 markdown）—— 渲染侧用 stripMarkdown() 清洗
  plan_text: `## This Week's Focus

This Week's Focus: reduce 3-putts from 4/round to under 2.

- Mon–Fri: 15 min putting drill at 3–10 ft
- Saturday: full range session, 60% wedge emphasis
- Sunday: short game practice (chips from 20 yd)

*Measure progress with putt count per round.*`,
  created_at: daysAgo(3),
} as any;

export const MOCK_TROUBLE_STATS: TroubleStats = {
  water: 4,
  ob: 2,
  bunker: 7,
  rough: 11,
  other: 1,
  totalRounds: 7,
  byPar: { par3: 5, par4: 14, par5: 6 },
};

export const MOCK_TROUBLE_INSIGHT =
  "Rough is your biggest leak — 11 incidents over 7 rounds, mostly on par 4 tee shots. " +
  "Your bunker play is costing you too: 7 sand saves needed, most ending in bogey. " +
  "Focus: 1) tee accuracy drill on par 4s, aim for 70% fairways in practice rounds; " +
  "2) 15 min/day sand-wedge splash drill from green-side bunkers.";

export const MOCK_DIAGNOSIS_REPORT: DiagnosisReport = {
  coreIssue:
    "Your scoring ceiling is pinned by short-game inefficiency, not ball-striking. " +
    "Over the last 7 rounds, you've averaged 33.1 putts — roughly 3 extra strokes per round versus a 30-putt baseline. " +
    "This one category alone accounts for ~60% of your score-above-par.",
  dataEvidence:
    "• Avg putts: 33.1/round (target: ≤30)\n" +
    "• 3-putts: 4.3/round (bogey-level golfers average 2.1)\n" +
    "• Bunker incidents: 7 total, 6 ended in bogey or worse\n" +
    "• Par 4 performance: +0.9/hole vs par 3s (+0.3) and par 5s (+0.5)",
  rootCause:
    "The pattern suggests lag-putting distance control is the bottleneck, not stroke mechanics. " +
    "Most 3-putts originate from first putts outside 25 ft. Combined with your bunker stats, " +
    "the common thread is touch/feel on half-to-quarter swings — the 'scoring zone' from 100 yd in.",
  practicePlan:
    "Week 1: daily 20 min on the putting green — lag-distance drill (3-putt circles at 20, 30, 40 ft).\n" +
    "Week 2: add 15 min/day in green-side bunker; goal = get out in one, land within 10 ft.\n" +
    "Week 3: on-course transfer — play 9 holes scoring only short game (putts + inside-100-yd).\n" +
    "Measure: putts/round trending down AND bunker sand-saves ≥ 50%.",
  raw: '',
};

export const MOCK_USER_STATS: UserStats = {
  user_id: MOCK_USER_ID,
  current_streak: 5,
  longest_streak: 12,
  total_practices: 48,
  last_practice_date: new Date().toISOString().split('T')[0],
  ai_plans_completed: 3,
  badges: [
    { id: 'streak_3', emoji: '🔥', label: '3-Day Streak', earned_at: daysAgo(5) },
    { id: 'streak_7', emoji: '⚡', label: '7-Day Streak', earned_at: daysAgo(1) },
  ],
  updated_at: new Date().toISOString(),
} as any;

// ── Flag + pub/sub ──────────────────────────────────────────────
let devMockActive = false;
const listeners = new Set<() => void>();

export function isDevMockActive(): boolean {
  return devMockActive;
}

export function activateDevMock(): void {
  if (devMockActive) return;
  devMockActive = true;
  listeners.forEach(l => l());
}

export function deactivateDevMock(): void {
  if (!devMockActive) return;
  devMockActive = false;
  listeners.forEach(l => l());
}

export function subscribeDevMock(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
