// Expo 在构建时把 EXPO_PUBLIC_* 内联进 bundle。声明它们的类型,
// 这样 process.env.EXPO_PUBLIC_* 才能通过类型检查。
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
  }
}
