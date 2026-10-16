// ============================================================
// Supabase Edge Function: analyze-round
// 代理 Claude API 调用,保护 API key 不暴露给客户端。逻辑见 handler.ts。
//
// 部署:
//   supabase functions deploy analyze-round
//
// Secrets(Dashboard > Edge Functions > Secrets;SUPABASE_* 由平台自动注入):
//   ANTHROPIC_API_KEY   必填
//   AI_DAILY_LIMIT      可选,每用户每日调用上限,默认 40
//   ANTHROPIC_MODEL     可选,默认 claude-sonnet-4-20250514
//   ALLOWED_ORIGINS     可选,逗号分隔的 Web 来源白名单
//
// 依赖迁移 20261016100400_ai_usage_quota.sql(consume_ai_quota)。
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
  const limit = Number(Deno.env.get('AI_DAILY_LIMIT') ?? '40');
  return {
    supabaseUrl: need('SUPABASE_URL'),
    anonKey: need('SUPABASE_ANON_KEY'),
    serviceKey: need('SUPABASE_SERVICE_ROLE_KEY'),
    anthropicKey: need('ANTHROPIC_API_KEY'),
    model: Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-20250514',
    dailyLimit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 40,
    allowedOrigins:
      Deno.env.get('ALLOWED_ORIGINS')?.split(',').map((s) => s.trim()).filter(Boolean) ?? DEFAULT_ORIGINS,
  };
}

Deno.serve(async (req) => {
  let env: Env;
  try {
    env = loadEnv();
  } catch (e) {
    console.error('[analyze-round]', e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ code: 'server_misconfigured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return handle(req, env);
});
