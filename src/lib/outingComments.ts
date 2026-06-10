// ============================================================
// 局内留言板数据层 —— 搭子/约局 v1(Phase 5)
// 读历史留言 + 发留言 + Realtime 订阅新留言。
// RLS 决定可见/可发权限,这里只管查询与订阅。
// ============================================================

import { supabase } from './supabase';
import { OutingComment } from '../types/buddies';

export async function listComments(outingId: string): Promise<OutingComment[]> {
  const { data } = await supabase
    .from('outing_comments')
    .select('*')
    .eq('outing_id', outingId)
    .order('created_at', { ascending: true });
  return (data ?? []) as OutingComment[];
}

export async function postComment(
  outingId: string,
  userId: string,
  body: string,
): Promise<boolean> {
  const text = body.trim();
  if (!text) return false;
  const { error } = await supabase
    .from('outing_comments')
    .insert({ outing_id: outingId, user_id: userId, body: text });
  return !error;
}

/** 订阅该局新留言;返回取消订阅函数 */
export function subscribeComments(
  outingId: string,
  onInsert: (c: OutingComment) => void,
): () => void {
  const channel = supabase
    .channel(`outing_comments:${outingId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'outing_comments',
        filter: `outing_id=eq.${outingId}`,
      },
      payload => onInsert(payload.new as OutingComment),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
