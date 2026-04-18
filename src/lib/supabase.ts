// ============================================================
// Supabase 클라이언트 초기화
// 웹: localStorage 사용 (SecureStore는 네이티브 전용)
// 네이티브(iOS/Android): expo-secure-store 사용
//
// EXPO_PUBLIC_* 변수는 Metro 빌드 타임에 번들에 베이크됨.
// Vercel/CI에서 빌드 시 반드시 환경변수로 설정해야 함.
// 설정 안된 경우 아래 fallback 값 사용 (anon key는 공개값).
// ============================================================

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// ── Storage adapters ─────────────────────────────────────────────────────────
const WebStorageAdapter = {
  getItem: (key: string): string | null => {
    try {
      if (typeof localStorage === 'undefined') return null;
      return localStorage.getItem(key);
    } catch { return null; }
  },
  setItem: (key: string, value: string): void => {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, value); } catch {}
  },
  removeItem: (key: string): void => {
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(key); } catch {}
  },
};

const NativeStorageAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const storageAdapter = Platform.OS === 'web' ? WebStorageAdapter : NativeStorageAdapter;

// ── Config — EXPO_PUBLIC_* 는 빌드 타임에 번들에 삽입됨 ─────────────────────
// Supabase URL/anon key는 공개값 (클라이언트 번들에 항상 노출됨).
// 보안은 Supabase RLS(Row Level Security)가 담당.
const supabaseUrl: string = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey: string = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Copy .env.example to .env and fill in values.'
  );
}

// ── Client ───────────────────────────────────────────────────────────────────
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
