// 运行:
//   docker run --rm -v "$PWD/supabase/functions/analyze-round":/app -w /app denoland/deno:alpine deno test handler_test.ts
// 全部使用注入的假 fetch,不访问网络、不消耗任何 API 额度。

import { handle, KIND_MAX_TOKENS, MAX_PROMPT_CHARS, thinkingConfig, type Env } from './handler.ts';

const env: Env = {
  supabaseUrl: 'https://proj.supabase.co',
  anonKey: 'anon-key',
  serviceKey: 'service-key',
  anthropicKey: 'sk-ant-test',
  model: 'test-model',
  dailyLimit: 5,
  allowedOrigins: ['https://everyone72.vercel.app'],
};

function ok(cond: unknown, msg: string) { if (!cond) throw new Error('FAIL: ' + msg); }
function eq<T>(a: T, b: T, msg: string) { if (a !== b) throw new Error(`FAIL: ${msg} (got ${String(a)}, want ${String(b)})`); }

interface Calls { auth: number; quota: number; claude: number; lastClaude?: Record<string, unknown>; lastClaudeHeaders?: HeadersInit; quotaBody?: Record<string, unknown> }

// 假后端:按 URL 分发。可按需覆盖每一路的行为。
function makeFetch(o: {
  authStatus?: number; userId?: string;
  quota?: unknown; quotaStatus?: number; quotaThrows?: boolean;
  claudeStatus?: number; claudeBody?: unknown; claudeThrows?: boolean;
} = {}) {
  const calls: Calls = { auth: 0, quota: 0, claude: 0 };
  const f = (async (input: Request | URL | string, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/auth/v1/user')) {
      calls.auth++;
      const s = o.authStatus ?? 200;
      return new Response(JSON.stringify(s === 200 ? { id: o.userId ?? 'user-1' } : { msg: 'bad' }), { status: s });
    }
    if (url.endsWith('/rest/v1/rpc/consume_ai_quota')) {
      calls.quota++;
      if (o.quotaThrows) throw new Error('db down');
      calls.quotaBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify(o.quota ?? true), { status: o.quotaStatus ?? 200 });
    }
    if (url === 'https://api.anthropic.com/v1/messages') {
      calls.claude++;
      if (o.claudeThrows) throw new DOMException('aborted', 'AbortError');
      calls.lastClaude = JSON.parse(String(init?.body));
      calls.lastClaudeHeaders = init?.headers;
      return new Response(
        JSON.stringify(o.claudeBody ?? { content: [{ type: 'text', text: '  Nice round.  ' }], stop_reason: 'end_turn' }),
        { status: o.claudeStatus ?? 200 },
      );
    }
    throw new Error('unexpected fetch ' + url);
  }) as typeof fetch;
  return { f, calls };
}

function post(body: unknown, headers: Record<string, string> = { Authorization: 'Bearer user-jwt-aaaaaaaaaaaa' }) {
  return new Request('https://x/functions/v1/analyze-round', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}
const PROMPT = 'Analyze this round: 90 strokes, 36 putts.';

Deno.test('CORS: 白名单来源回显,陌生来源不给 Allow-Origin', async () => {
  const { f } = makeFetch();
  const good = await handle(new Request('https://x', { method: 'OPTIONS', headers: { Origin: 'https://everyone72.vercel.app' } }), env, f);
  eq(good.headers.get('Access-Control-Allow-Origin'), 'https://everyone72.vercel.app', 'allowed origin echoed');
  const bad = await handle(new Request('https://x', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }), env, f);
  eq(bad.headers.get('Access-Control-Allow-Origin'), null, 'evil origin not allowed');
});

Deno.test('非 POST 返回 405', async () => {
  const { f } = makeFetch();
  eq((await handle(new Request('https://x', { method: 'GET' }), env, f)).status, 405, 'GET');
});

Deno.test('没有 Authorization 头 → 401,且不访问任何后端', async () => {
  const { f, calls } = makeFetch();
  const r = await handle(post({ prompt: PROMPT }, {}), env, f);
  eq(r.status, 401, 'status');
  eq(calls.auth + calls.quota + calls.claude, 0, 'no backend calls');
});

Deno.test('公开 key / 无效 JWT(Auth 拒绝)→ 401,不扣额度、不调 Claude', async () => {
  const { f, calls } = makeFetch({ authStatus: 401 });
  const r = await handle(post({ prompt: PROMPT }), env, f);
  eq(r.status, 401, 'status');
  eq(calls.quota, 0, 'quota untouched');
  eq(calls.claude, 0, 'claude untouched');
});

Deno.test('请求体非法 → 400(坏 JSON / prompt 太短 / 太长 / 非字符串 / 未知 kind)', async () => {
  for (const body of ['{not json', { prompt: 'short' }, { prompt: 'x'.repeat(MAX_PROMPT_CHARS + 1) }, { prompt: 123 }, { prompt: PROMPT, kind: 'free-chat' }]) {
    const { f, calls } = makeFetch();
    const r = await handle(post(body), env, f);
    eq(r.status, 400, 'status for ' + JSON.stringify(body).slice(0, 40));
    eq(calls.quota + calls.claude, 0, 'rejected before spending quota');
  }
});

Deno.test('额度用完 → 429,不调 Claude', async () => {
  const { f, calls } = makeFetch({ quota: false });
  const r = await handle(post({ prompt: PROMPT }), env, f);
  eq(r.status, 429, 'status');
  eq((await r.json()).code, 'quota_exceeded', 'code');
  eq(calls.claude, 0, 'claude untouched');
});

Deno.test('配额服务异常 → 503(fail closed),不调 Claude', async () => {
  for (const o of [{ quotaStatus: 500 }, { quotaThrows: true }]) {
    const { f, calls } = makeFetch(o);
    const r = await handle(post({ prompt: PROMPT }), env, f);
    eq(r.status, 503, 'status');
    eq(calls.claude, 0, 'claude untouched');
  }
});

Deno.test('成功:扣的是该用户的额度,Claude 请求带 system prompt / 模型 / 按 kind 的 max_tokens', async () => {
  const { f, calls } = makeFetch({ userId: 'user-42' });
  const r = await handle(post({ prompt: PROMPT, kind: 'diagnosis' }), env, f);
  eq(r.status, 200, 'status');
  const j = await r.json();
  eq(j.analysis, 'Nice round.', 'trimmed text');
  eq(j.truncated, false, 'not truncated');
  eq(calls.quotaBody?.p_user, 'user-42', 'quota charged to verified user, not a client-supplied id');
  eq(calls.quotaBody?.p_limit, 5, 'limit from env');
  eq(calls.lastClaude?.model, 'test-model', 'model');
  eq(calls.lastClaude?.max_tokens, KIND_MAX_TOKENS.diagnosis, 'max_tokens per kind');
  ok(String(calls.lastClaude?.system).includes('golf coaching'), 'system prompt present');
  eq((calls.lastClaude?.messages as { content: string }[])[0].content, PROMPT, 'prompt forwarded');
  eq((calls.lastClaudeHeaders as Record<string, string>)['x-api-key'], 'sk-ant-test', 'server-side key used');
});

Deno.test('kind 缺省按 analysis(512)', async () => {
  const { f, calls } = makeFetch();
  await handle(post({ prompt: PROMPT }), env, f);
  eq(calls.lastClaude?.max_tokens, 512, 'default max_tokens');
});

Deno.test('客户端不能自带 user id 冒用别人的额度', async () => {
  const { f, calls } = makeFetch({ userId: 'real-user' });
  await handle(post({ prompt: PROMPT, user_id: 'someone-else', p_user: 'someone-else' }), env, f);
  eq(calls.quotaBody?.p_user, 'real-user', 'ignores client-supplied ids');
});

Deno.test('被 max_tokens 截断时 truncated=true', async () => {
  const { f } = makeFetch({ claudeBody: { content: [{ type: 'text', text: 'partial' }], stop_reason: 'max_tokens' } });
  const j = await (await handle(post({ prompt: PROMPT }), env, f)).json();
  eq(j.truncated, true, 'truncated flag');
});

Deno.test('上游 429/529/5xx → 503 ai_unavailable,且不泄露上游内容', async () => {
  for (const s of [429, 500, 529]) {
    const { f } = makeFetch({ claudeStatus: s, claudeBody: { error: { message: 'secret upstream detail' } } });
    const r = await handle(post({ prompt: PROMPT }), env, f);
    eq(r.status, 503, 'status for upstream ' + s);
    const t = await r.text();
    ok(!t.includes('secret upstream detail'), 'no upstream leakage');
  }
});

Deno.test('上游 400 → 502 ai_error;上游超时/断开 → 504;空内容 → 502', async () => {
  eq((await handle(post({ prompt: PROMPT }), env, makeFetch({ claudeStatus: 400 }).f)).status, 502, 'upstream 400');
  eq((await handle(post({ prompt: PROMPT }), env, makeFetch({ claudeThrows: true }).f)).status, 504, 'timeout/abort');
  eq((await handle(post({ prompt: PROMPT }), env, makeFetch({ claudeBody: { content: [] } }).f)).status, 502, 'empty content');
  eq((await handle(post({ prompt: PROMPT }), env, makeFetch({ claudeBody: { content: [{ type: 'text', text: '   ' }] } }).f)).status, 502, 'blank text');
});

Deno.test('Sonnet 5.5 发送 thinking=between_tools,其他模型不带 thinking 字段(否则会 400)', async () => {
  eq(JSON.stringify(thinkingConfig('claude-sonnet-5-5')), '{"thinking":{"type":"between_tools"}}', 'sonnet 5.5');
  eq(JSON.stringify(thinkingConfig('claude-sonnet-4-6')), '{}', 'other model');

  const a = makeFetch();
  await handle(post({ prompt: PROMPT }), { ...env, model: 'claude-sonnet-5-5' }, a.f);
  eq((a.calls.lastClaude?.thinking as { type: string }).type, 'between_tools', 'body has thinking for sonnet 5.5');
  ok(!('temperature' in (a.calls.lastClaude ?? {})), 'no sampling params (rejected by Sonnet 5.5)');

  const b = makeFetch();
  await handle(post({ prompt: PROMPT }), { ...env, model: 'claude-sonnet-4-6' }, b.f);
  ok(!('thinking' in (b.calls.lastClaude ?? {})), 'no thinking field for other models');
});
