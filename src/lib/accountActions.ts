// ============================================================
// 删除账号(客户端部分)。真正的删除在 Edge Function `delete-account` 里用
// service_role 完成:转让 Crew、清照片、删 auth 用户,其余数据靠外键级联。
// 这里负责调用它、把错误翻译成人话、并清掉这台设备上本地残留的数据。
// ============================================================
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export const DELETE_CONFIRM_WORD = 'DELETE';

/** 用户输入的确认词是否有效(忽略首尾空白,区分大小写)。 */
export function isDeleteConfirmed(input: string): boolean {
  return input.trim() === DELETE_CONFIRM_WORD;
}

export type AccountErrorCode =
  | 'unauthorized' | 'prepare_failed' | 'storage_failed' | 'delete_failed' | 'unavailable';

export class AccountError extends Error {
  constructor(public code: AccountErrorCode) {
    super(code);
    this.name = 'AccountError';
  }
}

export function accountErrorMessage(err: unknown): string {
  const code = err instanceof AccountError ? err.code : 'unavailable';
  switch (code) {
    case 'unauthorized':
      return 'Your session expired. Please sign in again, then retry.';
    case 'prepare_failed':
    case 'storage_failed':
    case 'delete_failed':
      return 'We could not finish deleting your account. Nothing was lost — please try again in a moment.';
    default:
      return 'Account deletion is unavailable right now. Please try again in a moment.';
  }
}

const KNOWN_CODES: AccountErrorCode[] = ['unauthorized', 'prepare_failed', 'storage_failed', 'delete_failed'];

/** 调用 Edge Function 删除当前登录账号。成功返回;失败抛 AccountError。 */
export async function deleteAccountRemote(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', {
    body: { confirm: DELETE_CONFIRM_WORD },
  });
  if (!error) return;

  let code: AccountErrorCode = 'unavailable';
  const ctx = (error as { context?: unknown }).context;
  if (ctx && typeof (ctx as Response).json === 'function') {
    try {
      const body = await (ctx as Response).json();
      if (KNOWN_CODES.includes(body?.code)) code = body.code;
    } catch { /* 响应体不是 JSON,保持 unavailable */ }
  }
  console.warn('[Account] delete failed:', code);
  throw new AccountError(code);
}

const DRAFT_PREFIX = 'scorecard_draft_';

/** 清掉这台设备上属于该用户的本地数据(成绩草稿)。尽力而为,不抛错。 */
export async function clearLocalUserData(userId: string): Promise<void> {
  const prefix = `${DRAFT_PREFIX}${userId}_`;
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') return;
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
    } else {
      const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(prefix));
      if (keys.length) await AsyncStorage.multiRemove(keys);
    }
  } catch { /* 清理失败不应阻止退出 */ }
}
