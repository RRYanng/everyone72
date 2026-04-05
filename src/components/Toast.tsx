// ============================================================
// 全局 Toast 通知组件
// Web 上代替系统推送；真机上作为应用内 banner 显示
// 使用方式：import { showToast } from './Toast'
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ToastType = 'info' | 'success' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

// 全局单例队列
let _showToast: ((msg: string, type?: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = 'info') {
  _showToast?.(message, type);
}

// ── 单个 Toast 动画 ──────────────────────────────────────────
function ToastBanner({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.delay(2800),
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(onDone);
  }, []);

  const iconName =
    item.type === 'success' ? 'checkmark-circle' :
    item.type === 'warning' ? 'warning' : 'notifications';

  const bgColor =
    item.type === 'success' ? '#1a472a' :
    item.type === 'warning' ? '#f57c00' : '#1565c0';

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: bgColor },
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
        },
      ]}
    >
      <Ionicons name={iconName as any} size={18} color="#fff" />
      <Text style={styles.bannerText} numberOfLines={2}>{item.message}</Text>
    </Animated.View>
  );
}

// ── Toast 容器（挂载在 App 根部） ───────────────────────────
export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    _showToast = (message, type = 'info') => {
      const id = nextId.current++;
      setToasts(prev => [...prev.slice(-2), { id, message, type }]);
    };
    return () => { _showToast = null; };
  }, []);

  const remove = (id: number) =>
    setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <View style={styles.container} pointerEvents="none">
      {toasts.map(t => (
        <ToastBanner key={t.id} item={t} onDone={() => remove(t.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  bannerText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
});
