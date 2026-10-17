// 编辑 / 删除已保存成绩。所有写入都走服务端函数(update_round / delete_round),
// 总杆、推杆、相对标准杆由服务端重新汇总,删除时一并清理它生成的练习计划。
import { supabase } from './supabase';
import type { HoleEdit } from './roundStats';

export type RoundActionErrorCode = 'not_found' | 'invalid' | 'unauthorized' | 'failed';

export class RoundActionError extends Error {
  constructor(public code: RoundActionErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'RoundActionError';
  }
}

export function roundActionMessage(err: unknown): string {
  const code = err instanceof RoundActionError ? err.code : 'failed';
  switch (code) {
    case 'not_found':    return 'This round no longer exists.';
    case 'invalid':      return 'Some hole scores look invalid. Please check them and try again.';
    case 'unauthorized': return 'Your session expired. Please sign in again.';
    default:             return 'Something went wrong. Please check your connection and try again.';
  }
}

function toError(error: { message?: string } | null): RoundActionError {
  const m = error?.message ?? '';
  if (m === 'round_not_found')    return new RoundActionError('not_found');
  if (m === 'invalid_holes')      return new RoundActionError('invalid');
  if (m === 'not_authenticated')  return new RoundActionError('unauthorized');
  console.error('[roundActions] unexpected error:', m);
  return new RoundActionError('failed');
}

export async function updateRound(roundId: string, teeBox: string, holes: HoleEdit[]): Promise<void> {
  const { error } = await supabase.rpc('update_round', {
    p_round_id: roundId,
    p_tee_box:  teeBox,
    // par 不发给服务端:它用库里的标准杆,不能通过编辑改球场数据
    p_holes: holes.map(h => ({
      hole_number: h.hole_number, strokes: h.strokes, putts: h.putts, troubles: h.troubles ?? [],
    })),
  });
  if (error) throw toError(error);
}

export async function deleteRound(roundId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_round', { p_round_id: roundId });
  if (error) throw toError(error);
}
