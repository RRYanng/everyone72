// ============================================================
// 搭子红点 context(Phase 6 · Task 6.3) —— 把派生的未读计数广播给底部 tab。
//
// 刷新时机(非实时,按计划"轮询或聚焦时刷新即可"):
//   - 挂载时 + 每 30s 轮询;
//   - App 从后台回前台时(AppState active);
//   - Buddies tab 获得焦点时(导航里调 refresh);
//   - 进入"我的"页 markSeen() 后主动调 refresh() 清红点。
// ============================================================

import React, {
  createContext, useContext, useState, useCallback, useEffect,
} from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { getUnreadCount } from './buddiesNotifications';

interface BuddiesBadge {
  count: number;
  refresh: () => void;
}

const BuddiesBadgeContext = createContext<BuddiesBadge>({ count: 0, refresh: () => {} });

const POLL_MS = 30 * 1000;

export function BuddiesBadgeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!user) {
      setCount(0);
      return;
    }
    getUnreadCount(user.id).then(setCount).catch(() => {});
  }, [user]);

  // 挂载/用户变化时刷新 + 30s 轮询 + 回前台刷新
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    // react-native-web 在极老浏览器里 AppState 可能不可用,addEventListener
    // 返回 undefined —— 防御性兜底,避免 sub.remove() 抛 TypeError。
    let sub: { remove?: () => void } | undefined;
    try {
      sub = AppState.addEventListener('change', s => {
        if (s === 'active') refresh();
      });
    } catch {
      sub = undefined;
    }
    return () => {
      clearInterval(timer);
      sub?.remove?.();
    };
  }, [refresh]);

  return (
    <BuddiesBadgeContext.Provider value={{ count, refresh }}>
      {children}
    </BuddiesBadgeContext.Provider>
  );
}

export function useBuddiesBadge(): BuddiesBadge {
  return useContext(BuddiesBadgeContext);
}
