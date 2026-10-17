// ============================================================
// Streak & Badge 系统 —— 客户端只读。
//
// 连续天数、总次数和勋章都由服务端计算:每次插入 practice_logs,
// 触发器 apply_practice_day() 更新 user_stats(见迁移 20261017100100)。
// user_stats 对客户端只有 SELECT 权限,所以客户端既不需要、也不可能自己写。
// 这里只负责读取,以及对比打卡前后的勋章来提示"新解锁"。
// ============================================================

import { supabase } from './supabase';
import { UserStats, Badge } from '../types';
import { isDevMockActive, MOCK_USER_STATS } from './mockUser';

// ── 勋章展示用的定义(解锁规则在服务端,和 apply_practice_day 保持一致)──────────────
export const BADGE_DEFS: { id: string; emoji: string; label: string }[] = [
  { id: 'streak_3',      emoji: '🔥', label: '3-Day Streak' },
  { id: 'streak_7',      emoji: '⚡', label: '7-Day Streak' },
  { id: 'streak_30',     emoji: '🏆', label: '30-Day Streak' },
  { id: 'plans_10',      emoji: '🎯', label: '10 AI Plans Completed' },
  { id: 'practices_100', emoji: '💪', label: '100 Practice Sessions' },
];

// ── 获取用户统计 ──────────────────────────────────────────────
export async function getUserStats(userId: string): Promise<UserStats | null> {
  if (isDevMockActive()) return MOCK_USER_STATS;
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) { console.error('[Streak] getUserStats error:', error); return null; }
  if (!data) return null;

  return {
    ...data,
    badges: (data.badges ?? []) as Badge[],
  } as UserStats;
}

/** 打卡前后相比,新出现的勋章(按 id 对比)。 */
export function diffNewBadges(before: UserStats | null, after: UserStats | null): Badge[] {
  if (!after) return [];
  const had = new Set((before?.badges ?? []).map(b => b.id));
  return (after.badges ?? []).filter(b => !had.has(b.id));
}
