// ============================================================
// App 入口文件
// ============================================================

import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Navigation from './src/navigation';
import ToastContainer from './src/components/Toast';
import { registerForPushNotifications } from './src/lib/notifications';

export default function App() {
  useEffect(() => {
    // 真机上申请推送权限（Web 上此函数直接返回 null，不报错）
    registerForPushNotifications();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Navigation />
      {/* 全局 Toast 容器 — 悬浮在所有内容上方 */}
      <ToastContainer />
    </View>
  );
}
