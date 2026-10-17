// 跨平台对话框。
// react-native-web 的 Alert.alert 是空函数(什么都不会显示);而 window.confirm / window.alert
// 在内置浏览器、应用内 WebView 等环境里会直接返回 false / 不显示 —— "确认"于是静默取消。
// 所以网页端使用应用内弹窗(<DialogHost />,挂在 App 根部);原生仍用 Alert。
// 只有在 <DialogHost /> 还没挂载时才退回 window.confirm / window.alert。
import { Alert, Platform } from 'react-native';
import { createDialogQueue } from './dialogQueue';

export const dialogQueue = createDialogQueue();

/** 提示一条信息或错误。 */
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (dialogQueue.hasHost()) {
      void dialogQueue.push({ title, message, confirmLabel: 'OK', cancelLabel: null, destructive: false });
    } else if (typeof window !== 'undefined') {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
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
    if (dialogQueue.hasHost()) {
      return dialogQueue.push({ title, message, confirmLabel, cancelLabel: 'Cancel', destructive });
    }
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
