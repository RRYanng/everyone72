// ============================================================
// 基础埋点:把"关键动作发生了"告诉 track_event()(见迁移 app_events)。
//
// 原则:
//   * 只发枚举和数字:不发邮箱、成绩内容、自由文本。sanitizeProps 会丢弃其余的东西。
//   * 发了就不管:失败、没登录、dev mock、网络断开都静默忽略,永远不影响用户操作。
//   * 事件名必须在服务端白名单里(否则被服务端忽略),这里的类型保持同步。
// ============================================================
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { isDevMockActive } from './mockUser';

export type EventName =
  | 'app_open' | 'sign_up' | 'login'
  | 'round_saved' | 'round_edited' | 'round_deleted' | 'ai_result'
  | 'practice_checkin' | 'crew_created' | 'crew_joined'
  | 'outing_created' | 'outing_joined';

export type EventProps = Record<string, string | number | boolean>;

const MAX_KEYS = 8;
const MAX_STRING = 40;

/** 只保留短字符串 / 有限数字 / 布尔,最多 8 项;其他类型(对象、数组、null、undefined)丢弃。 */
export function sanitizeProps(props?: Record<string, unknown>): EventProps {
  const out: EventProps = {};
  if (!props) return out;
  for (const [k, v] of Object.entries(props)) {
    if (Object.keys(out).length >= MAX_KEYS) break;
    if (typeof v === 'string') out[k] = v.slice(0, MAX_STRING);
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
  }
  return out;
}

const PLATFORM = Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web' ? Platform.OS : null;

export function track(name: EventName, props?: Record<string, unknown>): void {
  if (isDevMockActive()) return;
  try {
    void Promise.resolve(
      supabase.rpc('track_event', { p_name: name, p_props: sanitizeProps(props), p_platform: PLATFORM }),
    ).catch(() => { /* 埋点失败不影响任何功能 */ });
  } catch { /* noop */ }
}

let openTracked = false;
/** 每次打开应用只记一次 app_open(多个页面都会调用也没关系)。 */
export function trackAppOpenOnce(): void {
  if (openTracked) return;
  openTracked = true;
  track('app_open');
}
