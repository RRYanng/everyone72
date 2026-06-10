// ============================================================
// 约局(Outings)数据层 —— 搭子/约局 v1(Phase 3 · Task 3.1)
// CRUD + 加入/退出/审批/移除。满员状态由数据库触发器
// sync_outing_status 自动维护(见 supabase/buddies_schema.sql)。
//
// 城市匹配规则(见计划文档 Phase 3 备注):
//   - createOuting 的 city 直接取用户 profile.city,不让用户在发局时重输,
//     保证发局方与看局方城市同源。
//   - listCityOutings 用 .ilike 做大小写不敏感匹配,避免因大小写错过。
// ============================================================

import { supabase } from './supabase';
import { getProfileExtras } from './profileExtras';
import { Outing, OutingMember, JoinMode } from '../types/buddies';

/** 发局表单输入。注意:不含 city —— city 由 createOuting 从 profile.city 派生。 */
export interface NewOutingInput {
  course_id: string;
  play_date: string;
  tee_time: string | null;
  slots_total: number;
  skill_pref: string;
  note: string | null;
  join_mode: JoinMode;
}

/**
 * 发起一个局:city 取自用户 profile.city(未设城市则不能发局)→
 * 建 outing + 把发起人写为 joined 成员。
 */
export async function createOuting(organizerId: string, input: NewOutingInput): Promise<Outing | null> {
  // 城市同源:发局方城市直接取 profile.city,不让用户在发局表单重输
  const extras = await getProfileExtras(organizerId);
  const city = extras?.city?.trim();
  if (!city) return null; // 没设城市的用户不能发局

  const { data, error } = await supabase
    .from('outings')
    .insert({ ...input, city, organizer_id: organizerId })
    .select()
    .single();
  if (error || !data) return null;

  await supabase.from('outing_members').insert({
    outing_id: data.id, user_id: organizerId, status: 'joined',
  });
  return data as Outing;
}

/** 同城开放的局(open/full),按开球日升序。城市用大小写不敏感匹配。 */
export async function listCityOutings(city: string): Promise<Outing[]> {
  // 用本地年月日,避免加州傍晚被 UTC 误判成"明天"而漏掉今天的局
  const n = new Date();
  const todayStr = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  const { data } = await supabase
    .from('outings')
    .select('*')
    .ilike('city', city)
    .in('status', ['open', 'full'])
    .gte('play_date', todayStr)
    .order('play_date', { ascending: true });
  return (data ?? []) as Outing[];
}

export async function getOuting(id: string): Promise<Outing | null> {
  const { data } = await supabase.from('outings').select('*').eq('id', id).maybeSingle();
  return (data as Outing) ?? null;
}

export async function listMembers(outingId: string): Promise<OutingMember[]> {
  const { data } = await supabase
    .from('outing_members').select('*').eq('outing_id', outingId)
    .order('joined_at', { ascending: true });
  return (data ?? []) as OutingMember[];
}

/** 加入:instant→joined,approve→pending(状态由 outing.join_mode 决定) */
export async function joinOuting(outingId: string, userId: string, joinMode: JoinMode): Promise<boolean> {
  const { error } = await supabase.from('outing_members').insert({
    outing_id: outingId, user_id: userId,
    status: joinMode === 'approve' ? 'pending' : 'joined',
  });
  return !error;
}

export async function leaveOuting(outingId: string, userId: string): Promise<boolean> {
  const { error } = await supabase.from('outing_members')
    .delete().eq('outing_id', outingId).eq('user_id', userId);
  return !error;
}

/** 组织者审批 pending→joined */
export async function approveMember(memberId: string): Promise<boolean> {
  const { error } = await supabase.from('outing_members')
    .update({ status: 'joined' }).eq('id', memberId);
  return !error;
}

/** 组织者移除成员 / 拒绝申请 = 删行 */
export async function removeMember(memberId: string): Promise<boolean> {
  const { error } = await supabase.from('outing_members').delete().eq('id', memberId);
  return !error;
}

export async function cancelOuting(outingId: string): Promise<boolean> {
  const { error } = await supabase.from('outings')
    .update({ status: 'cancelled' }).eq('id', outingId);
  return !error;
}
