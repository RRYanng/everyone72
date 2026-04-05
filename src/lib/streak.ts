// ============================================================
// Streak & Badge 系统
// 每次练习打卡后调用 updateStreak(userId)
// 自动计算连续天数、更新勋章
// ============================================================

import { supabase } from './supabase';
import { UserStats, Badge } from '../types';

// ── 勋章定义 ─────────────────────────────────────────────────
export const BADGE_DEFS: { id: string; emoji: string; label: string; check: (s: UserStats) => boolean }[] = [
  {
    id: 'streak_3',
    emoji: '🔥',
    label: '3-Day Streak',
    check: s => s.current_streak >= 3,
  },
  {
    id: 'streak_7',
    emoji: '⚡',
    label: '7-Day Streak',
    check: s => s.current_streak >= 7,
  },
  {
    id: 'streak_30',
    emoji: '🏆',
    label: '30-Day Streak',
    check: s => s.current_streak >= 30,
  },
  {
    id: 'plans_10',
    emoji: '🎯',
    label: '10 AI Plans Completed',
    check: s => s.ai_plans_completed >= 10,
  },
  {
    id: 'practices_100',
    emoji: '💪',
    label: '100 Practice Sessions',
    check: s => s.total_practices >= 100,
  },
];

// ── 日期工具 ──────────────────────────────────────────────────
function todayStr(): string {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}
function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.round(Math.abs(da - db) / 86400000);
}

// ── 获取用户统计 ──────────────────────────────────────────────
export async function getUserStats(userId: string): Promise<UserStats | null> {
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

// ── 核心：更新连续打卡 ────────────────────────────────────────
export async function updateStreak(userId: string): Promise<{
  stats: UserStats;
  newBadges: Badge[];
}> {
  const today = todayStr();

  // 读取当前统计（先 upsert 确保行存在）
  await supabase.from('user_stats').upsert(
    { user_id: userId },
    { onConflict: 'user_id', ignoreDuplicates: true }
  );

  const { data: raw } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  const current: UserStats = raw
    ? { ...raw, badges: (raw.badges ?? []) as Badge[] }
    : {
        user_id: userId,
        current_streak: 0,
        longest_streak: 0,
        total_practices: 0,
        last_practice_date: null,
        ai_plans_completed: 0,
        badges: [],
        updated_at: new Date().toISOString(),
      };

  // 计算新 streak
  let newStreak = 1;
  if (current.last_practice_date) {
    const diff = daysBetween(current.last_practice_date, today);
    if (diff === 0) {
      // 今天已经打卡过，不重复计算
      return { stats: current, newBadges: [] };
    } else if (diff === 1) {
      // 昨天打过 → 连续
      newStreak = current.current_streak + 1;
    } else {
      // 断了 → 重置
      newStreak = 1;
    }
  }

  const newLongest = Math.max(newStreak, current.longest_streak);
  const newTotal   = current.total_practices + 1;

  // 更新后的 stats（用于勋章判断）
  const updated: UserStats = {
    ...current,
    current_streak:    newStreak,
    longest_streak:    newLongest,
    total_practices:   newTotal,
    last_practice_date: today,
    updated_at:        new Date().toISOString(),
  };

  // 判断新解锁的勋章
  const existingIds = new Set(current.badges.map(b => b.id));
  const newBadges: Badge[] = [];

  for (const def of BADGE_DEFS) {
    if (!existingIds.has(def.id) && def.check(updated)) {
      const badge: Badge = {
        id: def.id,
        emoji: def.emoji,
        label: def.label,
        earned_at: new Date().toISOString(),
      };
      newBadges.push(badge);
    }
  }

  const allBadges: Badge[] = [...current.badges, ...newBadges];
  updated.badges = allBadges;

  // 写回数据库
  await supabase.from('user_stats').upsert({
    user_id:            userId,
    current_streak:     newStreak,
    longest_streak:     newLongest,
    total_practices:    newTotal,
    last_practice_date: today,
    badges:             allBadges,
    updated_at:         new Date().toISOString(),
  }, { onConflict: 'user_id' });

  return { stats: updated, newBadges };
}

// ── 标记完成 AI 练习计划 ──────────────────────────────────────
export async function incrementAIPlansCompleted(userId: string): Promise<void> {
  const stats = await getUserStats(userId);
  if (!stats) return;

  const newCount = stats.ai_plans_completed + 1;
  const updated: UserStats = { ...stats, ai_plans_completed: newCount };

  // 检查是否解锁勋章
  const existingIds = new Set(stats.badges.map(b => b.id));
  const newBadges: Badge[] = [];
  for (const def of BADGE_DEFS) {
    if (!existingIds.has(def.id) && def.check(updated)) {
      newBadges.push({ id: def.id, emoji: def.emoji, label: def.label, earned_at: new Date().toISOString() });
    }
  }

  await supabase.from('user_stats').update({
    ai_plans_completed: newCount,
    badges: [...stats.badges, ...newBadges],
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);
}
