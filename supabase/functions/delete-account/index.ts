// ============================================================
// Supabase Edge Function: delete-account
// 应用内删除账号。逻辑见 handler.ts。
//
// 部署:
//   supabase functions deploy delete-account
//
// 环境变量:SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY 由平台自动注入;
//   ALLOWED_ORIGINS 可选,逗号分隔的 Web 来源白名单。
//
// 依赖迁移 20261016150000_account_deletion.sql(prepare_account_deletion)。
// ============================================================

import { handle, type Env } from './handler.ts';

const DEFAULT_ORIGINS = [
  'https://everyone72.vercel.app',
  'http://localhost:8081',
  'http://localhost:19006',
];

function loadEnv(): Env {
  const need = (k: string) => {
    const v = Deno.env.get(k);
    if (!v) throw new Error(`Missing env ${k}`);
    return v;
  };
  return {
    supabaseUrl: need('SUPABASE_URL'),
    anonKey: need('SUPABASE_ANON_KEY'),
    serviceKey: need('SUPABASE_SERVICE_ROLE_KEY'),
    allowedOrigins:
      Deno.env.get('ALLOWED_ORIGINS')?.split(',').map((s) => s.trim()).filter(Boolean) ?? DEFAULT_ORIGINS,
  };
}

Deno.serve(async (req) => {
  let env: Env;
  try {
    env = loadEnv();
  } catch (e) {
    console.error('[delete-account]', e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ code: 'server_misconfigured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return handle(req, env);
});
