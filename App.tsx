// ============================================================
// App 入口文件
// ============================================================

import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import Navigation from './src/navigation';
import ToastContainer from './src/components/Toast';
import DialogHost from './src/components/DialogHost';
import ErrorBoundary from './src/components/ErrorBoundary';
import { registerForPushNotifications } from './src/lib/notifications';
import { initMonitoring } from './src/lib/monitoring';
import { APP_FONTS, FONT_LOAD_TIMEOUT_MS } from './src/lib/fonts';
import { colors } from './src/theme';

// 越早越好:要在第一次渲染之前就能捕获错误
initMonitoring();

export default function App() {
  const [fontsLoaded, fontError] = useFonts(APP_FONTS);
  const [fontWaitOver, setFontWaitOver] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontWaitOver(true), FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // 真机上申请推送权限（Web 上此函数直接返回 null，不报错）
    registerForPushNotifications();
  }, []);

  // 等字体加载完再显示,避免标题先用后备字体、再跳成 Cormorant;
  // 加载失败或超时就直接显示(后备衬线字体),不会卡住应用
  if (!fontsLoaded && !fontError && !fontWaitOver) {
    return <View style={{ flex: 1, backgroundColor: colors.washi }} />;
  }

  return (
    <ErrorBoundary>
      <View style={{ flex: 1 }}>
        <StatusBar style="light" />
        <Navigation />
        {/* 全局 Toast 容器 — 悬浮在所有内容上方 */}
        <ToastContainer />
        {/* 网页端的应用内确认/提示弹窗(window.confirm 在内置浏览器里不可用) */}
        <DialogHost />
      </View>
    </ErrorBoundary>
  );
}
