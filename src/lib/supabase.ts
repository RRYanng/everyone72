// ============================================================
// Supabase 클라이언트 초기화
// 웹: localStorage 사용 (SecureStore는 네이티브 전용)
// 네이티브(iOS/Android): expo-secure-store 사용
// ============================================================

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// 웹용 localStorage 어댑터
const WebStorageAdapter = {
  getItem: (key: string): string | null => {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
  removeItem: (key: string): void => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
};

// 네이티브용 SecureStore 어댑터
const NativeStorageAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// 플랫폼에 따라 올바른 어댑터 선택
const storageAdapter = Platform.OS === 'web' ? WebStorageAdapter : NativeStorageAdapter;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    // 웹에서 URL hash의 access_token을 자동으로 감지
    detectSessionInUrl: Platform.OS === 'web',
  },
});
