// ============================================================
// 错误监控(Sentry)。
//
// 只有设置了 EXPO_PUBLIC_SENTRY_DSN 才会启用;没设置时所有函数都是空操作,
// 所以本地开发、CI 和没配置 Sentry 的部署都不受影响。
//
// 隐私:只上报错误本身和匿名的用户 id。邮箱、IP、请求头/Cookie、URL 的查询串和
// 锚点(可能带登录令牌)、控制台输出一律不上报(见 scrubEvent / scrubBreadcrumb)。
// ============================================================
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
let enabled = false;

/** 去掉 URL 的查询串和锚点(登录回调可能把令牌放在这里)。 */
export function stripUrl(url: unknown): unknown {
  if (typeof url !== 'string') return url;
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function scrubEvent(event: any): any {
  if (event.user) {
    event.user = event.user.id ? { id: event.user.id } : undefined;
  }
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
    delete event.request.query_string;
    if (event.request.url) event.request.url = stripUrl(event.request.url);
  }
  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs
      .map(scrubBreadcrumb)
      .filter((b: unknown) => b !== null);
  }
  return event;
}

/** 面包屑:丢弃控制台输出,清理 URL。返回 null 表示丢弃。 */
export function scrubBreadcrumb(crumb: any): any {
  if (crumb.category === 'console') return null;
  if (crumb.data) {
    for (const k of ['url', 'from', 'to']) {
      if (k in crumb.data) crumb.data[k] = stripUrl(crumb.data[k]);
    }
  }
  return crumb;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function initMonitoring(): void {
  if (!DSN) return;
  try {
    Sentry.init({
      dsn: DSN,
      environment: __DEV__ ? 'development' : 'production',
      release: `everyone72@${Constants.expoConfig?.version ?? 'unknown'}`,
      sendDefaultPii: false,
      tracesSampleRate: 0,        // 只收错误,不收性能追踪
      attachScreenshot: false,
      beforeSend: (event) => scrubEvent(event),
      beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
    });
    enabled = true;
  } catch (e) {
    console.warn('[monitoring] init failed:', e);
  }
}

/** 上报一个已捕获的错误。没启用 Sentry 时只打印到控制台。 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  console.error('[error]', error);
  if (!enabled) return;
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch { /* 监控自己出错不能影响应用 */ }
}

/** 只记录匿名 id,不记录邮箱。登出时传 null。 */
export function setMonitoringUser(id: string | null): void {
  if (!enabled) return;
  try {
    Sentry.setUser(id ? { id } : null);
  } catch { /* noop */ }
}
