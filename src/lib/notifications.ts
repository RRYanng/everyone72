// ============================================================
// 通知工具模块 —— 目前只负责真机的推送权限申请。
//
// 之前这里有 notifyFriendRequest / notifyFriendRequestAccepted /
// notifyFriendPracticed:它们只会在**操作者自己**的设备上弹一条本地提示
// ("X 向你发来好友请求"出现在发请求的人屏幕上),并不会通知对方,已删除。
// 真正通知对方需要服务端推送(存 push token + Edge Function 发送)。
// ============================================================

import { Platform } from 'react-native';

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
