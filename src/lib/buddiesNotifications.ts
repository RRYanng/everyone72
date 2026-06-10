// ============================================================
// 搭子未读计数(Phase 6 · Task 6.1) —— 派生,不建表。
//
// "上次查看搭子板块的时间"存在 localStorage(仅 web,沿用记分卡草稿
// 那套 web 守卫:非 web / 无 window 直接降级)。getUnreadCount 基于
// 这个时间戳对比派生两类新动态:
//   a) 我发起的局里,别人新加入/新申请(outing_members.joined_at > lastSeen)
//   b) 我加入的局里,别人发的新留言(outing_comments.created_at > lastSeen)
// 不建通知表、不引入 AsyncStorage。
// ============================================================

import { Platform } from 'react-native';
import { supabase } from './supabase';

const LAST_SEEN_KEY = 'buddies_last_seen';

/**
 * web 环境守卫:非 web / 无 window/localStorage 时为 false(降级:不显示红点)。
 * 额外做一次读写探针 —— Safari 隐私模式下 localStorage 对象存在但读写会抛
 * QuotaExceededError;不探针就会让 getLastSeen 反复返回 null、每次都被当成
 * "首次使用"重置基准时间(红点永远清不掉)。探针失败即视为不可用,干净降级。
 */
function canUseStorage(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }
  try {
    const probe = '__buddies_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/** 上次查看时间(ISO 字符串);从未查看过返回 null。 */
export function getLastSeen(): string | null {
  if (!canUseStorage()) return null;
  try {
    return localStorage.getItem(LAST_SEEN_KEY);
  } catch {
    return null;
  }
}

/** 标记"刚查看过搭子板块",把红点清零的基准时间推到现在。 */
export function markSeen(): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
  } catch {
    /* 隐私模式 / 配额超限 —— 静默降级 */
  }
}

/**
 * 派生未读计数(a + b)。
 * - 非 web:返回 0。
 * - 首次使用(无 lastSeen):写入当前时间作为基准,返回 0(避免把历史动态全算成未读)。
 */
export async function getUnreadCount(userId: string): Promise<number> {
  if (!canUseStorage()) return 0;

  const lastSeen = getLastSeen();
  if (!lastSeen) {
    markSeen();
    return 0;
  }

  try {
    // 我发起的局 ids / 我有份(加入或申请)的局 ids
    const [{ data: orgRows }, { data: memRows }] = await Promise.all([
      supabase.from('outings').select('id').eq('organizer_id', userId),
      supabase.from('outing_members').select('outing_id').eq('user_id', userId),
    ]);

    const myOrganizedIds = (orgRows ?? []).map((r: { id: string }) => r.id);
    const myMemberOutingIds = Array.from(
      new Set((memRows ?? []).map((r: { outing_id: string }) => r.outing_id)),
    );

    // a) 我发起的局里别人新加入/新申请(排除自己)。
    //    不按 status 过滤是有意的:joined(直接加入)和 pending(待审批申请)
    //    都是组织者关心的"新动态",两种状态都带 joined_at,这里一并计入。
    const newMembersP = myOrganizedIds.length
      ? supabase
          .from('outing_members')
          .select('id', { count: 'exact', head: true })
          .in('outing_id', myOrganizedIds)
          .gt('joined_at', lastSeen)
          .neq('user_id', userId)
      : Promise.resolve({ count: 0 });

    // b) 我加入的局里别人发的新留言(排除自己)
    const newCommentsP = myMemberOutingIds.length
      ? supabase
          .from('outing_comments')
          .select('id', { count: 'exact', head: true })
          .in('outing_id', myMemberOutingIds)
          .gt('created_at', lastSeen)
          .neq('user_id', userId)
      : Promise.resolve({ count: 0 });

    const [{ count: newMembers }, { count: newComments }] = await Promise.all([
      newMembersP,
      newCommentsP,
    ]);

    return (newMembers ?? 0) + (newComments ?? 0);
  } catch {
    return 0;
  }
}
