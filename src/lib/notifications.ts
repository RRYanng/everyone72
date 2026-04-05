// ============================================================
// 通知工具模块
// - Web：调用 showToast（全局 banner）
// - 真机：调用 expo-notifications 系统推送
// ============================================================

import { Platform } from 'react-native';
import { showToast } from '../components/Toast';

// 真机上懒加载 expo-notifications（Web bundle 不引入）
let Notifications: any = null;
async function getNotifications() {
  if (Platform.OS === 'web') return null;
  if (!Notifications) {
    Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
  return Notifications;
}

// ── 权限申请（真机启动时调用一次） ─────────────────────────
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const N = await getNotifications();
    if (!N) return null;
    const { status: existing } = await N.getPermissionsAsync();
    const finalStatus = existing === 'granted'
      ? existing
      : (await N.requestPermissionsAsync()).status;
    if (finalStatus !== 'granted') return null;
    return (await N.getExpoPushTokenAsync()).data;
  } catch {
    return null;
  }
}

// ── 辅助：发本地通知 or Toast ───────────────────────────────
async function notify(title: string, body: string, type: 'info' | 'success' | 'warning' = 'info') {
  if (Platform.OS === 'web') {
    showToast(body, type);
    return;
  }
  try {
    const N = await getNotifications();
    await N?.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch {
    showToast(body, type);
  }
}

// ── 公开通知方法 ─────────────────────────────────────────────
export const notifyFriendPracticed = (friendName: string) =>
  notify('Friend Activity', `${friendName} just logged a practice session! 🏌️`, 'info');

export const notifyFriendRequest = (fromName: string) =>
  notify('Friend Request', `${fromName} sent you a friend request!`, 'success');

export const notifyFriendRequestAccepted = (fromName: string) =>
  notify('Friend Request Accepted', `${fromName} accepted your friend request! 🎉`, 'success');
