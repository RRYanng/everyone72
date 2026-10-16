// 跨平台对话框。
// react-native-web 的 Alert.alert 是空函数(什么都不会显示),所以网页版上
// 用 Alert.alert 做"确认"会让 Promise 永远不 resolve、错误提示也看不到。
// 网页用 window.alert / window.confirm,原生仍用 Alert。
import { Alert, Platform } from 'react-native';

/** 提示一条信息或错误。 */
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

/** 让用户确认一个操作;确认返回 true,取消 / 关闭返回 false。 */
export function confirmAction(
  title: string,
  message: string,
  confirmLabel = 'OK',
  destructive = false,
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`));
  }
  return new Promise<boolean>(resolve => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
