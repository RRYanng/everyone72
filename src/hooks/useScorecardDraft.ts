// ============================================================
// useScorecardDraft — 记分卡草稿持久化 Hook（两层防护）
//
// 第一层（本地，必做）
//   Web:     localStorage
//   Native:  AsyncStorage
//   Key 格式: scorecard_draft_{courseId}
//   每次输入 debounce 500ms 写入；草稿保留 7 天后自动清除。
//
// 第二层（云端同步，次要）
//   Supabase 表 scorecard_drafts，输入变化后 debounce 30s upsert。
//   加载时比较本地 savedAt 与远程 updated_at，自动取较新的一份，
//   支持换设备继续填。
//
// 注：localStorage key 仍是 courseId-only（不含 date）；round_date
//     只存在草稿数据内部，用于 Supabase 的 (user_id, course_id,
//     round_date) 唯一约束 upsert。远程查询按 (user_id, course_id)
//     取 updated_at 最新的一行，因此 key 不带 date 也能正确对齐。
// ============================================================

import { useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { HoleScore } from '../types';

// ── 草稿数据结构 ──────────────────────────────────────────────
export interface ScorecardDraft {
  courseId: string;
  teeBox: string;
  totalHoles: number;
  scores: HoleScore[];
  currentHole: number;
  step: 1 | 2 | 3;
  roundDate: string; // YYYY-MM-DD —— 供 Supabase upsert 唯一约束
  savedAt: string;   // ISO timestamp —— 最后修改时间
}

const DRAFT_PREFIX = 'scorecard_draft_';
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const REMOTE_DEBOUNCE_MS = 30 * 1000;         // 第二层：30s 才打一次远程请求

// ── 跨平台存储适配器（第一层） ───────────────────────────────
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return typeof localStorage !== 'undefined'
          ? localStorage.getItem(key)
          : null;
      } catch {
        return null;
      }
    }
    return AsyncStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
      } catch { /* quota exceeded / 隐私模式 — 静默降级 */ }
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch { /* 静默降级，不让 App 崩溃 */ }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch { /* noop */ }
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch { /* noop */ }
  },
};

// ── Helper: key builder ──────────────────────────────────────
function draftKey(courseId: string): string {
  return `${DRAFT_PREFIX}${courseId}`;
}

// ── Hook ─────────────────────────────────────────────────────
export function useScorecardDraft(courseId: string, userId?: string | null) {
  const localTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 清理 debounce timers
  useEffect(() => {
    return () => {
      if (localTimer.current)  clearTimeout(localTimer.current);
      if (remoteTimer.current) clearTimeout(remoteTimer.current);
    };
  }, []);

  // ── 第一层：本地读取 ───────────────────────────────────────
  const loadLocal = useCallback(async (): Promise<ScorecardDraft | null> => {
    try {
      const raw = await storage.getItem(draftKey(courseId));
      if (!raw) return null;

      const draft: ScorecardDraft = JSON.parse(raw);

      // 过期检查
      const savedTime = new Date(draft.savedAt).getTime();
      if (Date.now() - savedTime > DRAFT_TTL_MS) {
        await storage.removeItem(draftKey(courseId));
        return null;
      }
      return draft;
    } catch {
      return null;
    }
  }, [courseId]);

  // ── 第二层：远程读取（取该球场 updated_at 最新的一行） ──────
  const loadRemote = useCallback(async (): Promise<ScorecardDraft | null> => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('scorecard_drafts')
        .select('draft_data, updated_at')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      // 远程过期检查（与 loadLocal 的 7 天 TTL 一致）。
      // 取的是 updated_at 最新的一行，若它已过期，其余必然更旧 ——
      // 顺手删掉该球场所有草稿行，避免远程表堆积废行。
      const updatedTime = new Date(data.updated_at).getTime();
      if (Date.now() - updatedTime > DRAFT_TTL_MS) {
        try {
          await supabase
            .from('scorecard_drafts')
            .delete()
            .eq('user_id', userId)
            .eq('course_id', courseId);
        } catch {
          // noop —— 清理失败不影响返回结果
        }
        return null;
      }

      const draft = data.draft_data as ScorecardDraft;
      // 用服务端 updated_at 作为权威时间戳，便于与本地比较
      return { ...draft, savedAt: data.updated_at };
    } catch {
      return null;
    }
  }, [userId, courseId]);

  // ── 加载入口：比较两层，自动取较新的一份 ───────────────────
  const resolveDraft = useCallback(async (): Promise<ScorecardDraft | null> => {
    const [local, remote] = await Promise.all([loadLocal(), loadRemote()]);
    if (!local && !remote) return null;
    if (local && !remote) return local;
    if (remote && !local) return remote;

    // 两份都在 —— 比较时间戳，取较新者
    const localTime  = new Date(local!.savedAt).getTime();
    const remoteTime = new Date(remote!.savedAt).getTime();
    return remoteTime > localTime ? remote! : local!;
  }, [loadLocal, loadRemote]);

  // ── 第二层：远程 upsert（30s debounce） ────────────────────
  const saveRemote = useCallback(
    (draft: Omit<ScorecardDraft, 'savedAt'>) => {
      if (!userId) return;
      if (remoteTimer.current) clearTimeout(remoteTimer.current);

      remoteTimer.current = setTimeout(async () => {
        try {
          const now = new Date().toISOString();
          const fullDraft: ScorecardDraft = { ...draft, savedAt: now };
          await supabase
            .from('scorecard_drafts')
            .upsert(
              {
                user_id:    userId,
                course_id:  courseId,
                round_date: draft.roundDate,
                draft_data: fullDraft,
                updated_at: now,
              },
              { onConflict: 'user_id,course_id,round_date' },
            );
        } catch {
          // 远程失败 —— 静默降级，本地草稿仍然在，不影响用户
        }
      }, REMOTE_DEBOUNCE_MS);
    },
    [userId, courseId],
  );

  // ── 保存草稿（本地 500ms + 远程 30s，一次调用同时触发两层） ──
  const saveDraft = useCallback(
    (draft: Omit<ScorecardDraft, 'savedAt'>) => {
      // 第一层：本地，debounce 500ms
      if (localTimer.current) clearTimeout(localTimer.current);
      localTimer.current = setTimeout(async () => {
        try {
          const fullDraft: ScorecardDraft = {
            ...draft,
            savedAt: new Date().toISOString(),
          };
          await storage.setItem(draftKey(courseId), JSON.stringify(fullDraft));
        } catch {
          // 存储失败 — 静默处理，不影响用户体验
        }
      }, 500);

      // 第二层：远程，debounce 30s
      saveRemote(draft);
    },
    [courseId, saveRemote],
  );

  // ── 立即保存本地（不 debounce，用于退出前同步保存） ─────────
  const saveDraftNow = useCallback(
    async (draft: Omit<ScorecardDraft, 'savedAt'>) => {
      if (localTimer.current) clearTimeout(localTimer.current);
      try {
        const fullDraft: ScorecardDraft = {
          ...draft,
          savedAt: new Date().toISOString(),
        };
        await storage.setItem(draftKey(courseId), JSON.stringify(fullDraft));
      } catch {
        // noop
      }
    },
    [courseId],
  );

  // ── 清除草稿（提交成功 / 放弃时调用：本地 + 远程都清） ───────
  const clearDraft = useCallback(async () => {
    if (localTimer.current)  clearTimeout(localTimer.current);
    if (remoteTimer.current) clearTimeout(remoteTimer.current);

    // 第一层：本地
    try {
      await storage.removeItem(draftKey(courseId));
    } catch {
      // noop
    }

    // 第二层：远程（删除该球场全部草稿行）
    if (userId) {
      try {
        await supabase
          .from('scorecard_drafts')
          .delete()
          .eq('user_id', userId)
          .eq('course_id', courseId);
      } catch {
        // noop —— 远程删除失败不影响本地体验
      }
    }
  }, [courseId, userId]);

  // ── 检查是否存在草稿（本地 + 远程，轻量） ──────────────────
  const hasDraft = useCallback(async (): Promise<boolean> => {
    const draft = await resolveDraft();
    return draft !== null;
  }, [resolveDraft]);

  return {
    resolveDraft,   // 加载入口：自动取较新的一份（本地 vs 远程）
    loadLocal,      // 仅本地
    loadRemote,     // 仅远程
    saveDraft,      // 本地 500ms + 远程 30s
    saveDraftNow,   // 立即写本地
    clearDraft,     // 本地 + 远程
    hasDraft,
  };
}

// ── 静态工具函数（供 HomeScreen 等外部调用，仅本地） ─────────
/**
 * 检查所有球场是否存在未完成草稿（本地）
 * 返回第一个找到的草稿信息（用于在首页显示恢复横幅）
 */
export async function findAnyDraft(): Promise<ScorecardDraft | null> {
  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage === 'undefined') return null;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(DRAFT_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const draft: ScorecardDraft = JSON.parse(raw);
            const savedTime = new Date(draft.savedAt).getTime();
            if (Date.now() - savedTime <= DRAFT_TTL_MS) {
              return draft;
            }
            // 过期了 — 清除
            localStorage.removeItem(key);
          }
        }
      }
    } catch {
      // noop
    }
    return null;
  }

  // Native: AsyncStorage 不支持 enumerate keys by prefix
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const draftKeys = allKeys.filter(k => k.startsWith(DRAFT_PREFIX));
    for (const key of draftKeys) {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const draft: ScorecardDraft = JSON.parse(raw);
        const savedTime = new Date(draft.savedAt).getTime();
        if (Date.now() - savedTime <= DRAFT_TTL_MS) {
          return draft;
        }
        await AsyncStorage.removeItem(key);
      }
    }
  } catch {
    // noop
  }
  return null;
}
