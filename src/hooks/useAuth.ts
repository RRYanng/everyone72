// ============================================================
// useAuth Hook — 管理用户登录状态
// ============================================================

import { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  MOCK_SESSION, MOCK_USER,
  isDevMockActive, subscribeDevMock, deactivateDevMock,
} from '../lib/mockUser';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(
    isDevMockActive() ? MOCK_SESSION : null,
  );
  const [user, setUser] = useState<User | null>(
    isDevMockActive() ? MOCK_USER : null,
  );
  const [loading, setLoading] = useState(!isDevMockActive());

  useEffect(() => {
    // DEV mock flag 变化时同步 auth 状态（Skip Login 按钮触发）
    const unsubMock = subscribeDevMock(() => {
      if (isDevMockActive()) {
        setSession(MOCK_SESSION);
        setUser(MOCK_USER);
        setLoading(false);
      } else {
        setSession(null);
        setUser(null);
      }
    });

    // mock 激活时跳过真实 Supabase 初始化
    if (isDevMockActive()) {
      return () => { unsubMock(); };
    }

    // 3秒超时兜底：Supabase 未配置时不卡在 loading
    const timeout = setTimeout(() => setLoading(false), 3000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      clearTimeout(timeout);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      unsubMock();
    };
  }, []);

  const signOut = async () => {
    if (isDevMockActive()) {
      deactivateDevMock();
      return;
    }
    await supabase.auth.signOut();
  };

  return { session, user, loading, signOut };
}
