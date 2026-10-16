// ============================================================
// analyze-round 的请求处理逻辑(纯函数,依赖由调用方注入,便于单测)
//
// 做了什么(相对旧版):
//   1. 真正验证登录用户:用用户的 JWT 去问 Supabase Auth。
//      旧版只检查 Authorization 头"存在",任何字符串都能过。
//   2. 每用户每日配额(consume_ai_quota,service_role 调用)。
//   3. prompt 长度上限;按 kind 限定 max_tokens(旧版固定 512,Diagnosis 会被截断)。
//   4. 服务端 system prompt:只做高尔夫教练分析,降低被当成通用 Claude 代理的价值。
//   5. 上游超时、状态码和响应体校验;不把上游错误原文返回给客户端。
//   6. CORS 白名单(原生 App 没有 Origin 头,不受影响)。
// ============================================================

export interface Env {
  supabaseUrl: string;
  anonKey: string;
  serviceKey: string;
  anthropicKey: string;
  model: string;
  dailyLimit: number;
  allowedOrigins: string[];
}

export const KIND_MAX_TOKENS = {
  analysis: 512,
  plan: 700,
  diagnosis: 1400,   // 四段、约 490 词的结构化报告,512 会被截断
  trouble: 400,
} as const;
export type Kind = keyof typeof KIND_MAX_TOKENS;

export const MAX_PROMPT_CHARS = 12000;
export const UPSTREAM_TIMEOUT_MS = 45000;

const SYSTEM_PROMPT =
  'You are the golf coaching engine inside the Everyone 72 app. ' +
  "Only analyze the golfer's rounds, practice and course management using the data provided. " +
  'If the request is about anything other than golf coaching, reply exactly: ' +
  '"I can only help with golf coaching."';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const h: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (origin && allowed.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

type Fetch = typeof fetch;

export async function handle(req: Request, env: Env, fetchImpl: Fetch = fetch): Promise<Response> {
  const cors = corsHeaders(req.headers.get('Origin'), env.allowedOrigins);
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { code: 'method_not_allowed' });

  // 1. 验证用户 —— 让 Supabase Auth 校验这个 JWT;publishable/anon key 过不了这一关
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ') || authHeader.length < 20) {
    return json(401, { code: 'unauthorized' });
  }
  let userId: string | null = null;
  try {
    const r = await fetchImpl(`${env.supabaseUrl}/auth/v1/user`, {
      headers: { apikey: env.anonKey, Authorization: authHeader },
    });
    if (r.ok) {
      const u = await r.json();
      if (typeof u?.id === 'string') userId = u.id;
    }
  } catch (e) {
    console.error('[analyze-round] auth check failed:', e);
    return json(503, { code: 'auth_unavailable' });
  }
  if (!userId) return json(401, { code: 'unauthorized' });

  // 2. 解析并校验请求体
  let prompt: unknown;
  let kindRaw: unknown;
  try {
    ({ prompt, kind: kindRaw } = await req.json());
  } catch {
    return json(400, { code: 'bad_request' });
  }
  if (typeof prompt !== 'string' || prompt.length < 10 || prompt.length > MAX_PROMPT_CHARS) {
    return json(400, { code: 'bad_request' });
  }
  const kind: Kind = kindRaw === undefined ? 'analysis' : (kindRaw as Kind);
  if (!(kind in KIND_MAX_TOKENS)) return json(400, { code: 'bad_request' });

  // 3. 每日配额(失败即拒绝:宁可 AI 暂时不可用,也不能让费用失控)
  try {
    const q = await fetchImpl(`${env.supabaseUrl}/rest/v1/rpc/consume_ai_quota`, {
      method: 'POST',
      headers: {
        apikey: env.serviceKey,
        Authorization: `Bearer ${env.serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_user: userId, p_limit: env.dailyLimit }),
    });
    if (!q.ok) {
      console.error('[analyze-round] quota rpc status', q.status);
      return json(503, { code: 'quota_unavailable' });
    }
    if ((await q.json()) !== true) return json(429, { code: 'quota_exceeded' });
  } catch (e) {
    console.error('[analyze-round] quota check failed:', e);
    return json(503, { code: 'quota_unavailable' });
  }

  // 4. 调用 Claude(带超时)
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetchImpl(CLAUDE_API_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: env.model,
        max_tokens: KIND_MAX_TOKENS[kind],
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error('[analyze-round] upstream status', res.status, 'kind', kind);
      // 429 / 5xx / 529(overloaded)是暂时性的;其余 4xx 是我们的请求有问题
      return res.status === 429 || res.status >= 500
        ? json(503, { code: 'ai_unavailable' })
        : json(502, { code: 'ai_error' });
    }

    const data = await res.json();
    const block = Array.isArray(data?.content)
      ? data.content.find((b: { type?: string }) => b?.type === 'text')
      : null;
    const text = typeof block?.text === 'string' ? block.text.trim() : '';
    if (!text) {
      console.error('[analyze-round] upstream returned no text, stop_reason', data?.stop_reason);
      return json(502, { code: 'ai_error' });
    }
    return json(200, { analysis: text, truncated: data.stop_reason === 'max_tokens' });
  } catch (e) {
    console.error('[analyze-round] upstream call failed:', e instanceof Error ? e.name : e);
    return json(504, { code: 'ai_unavailable' });
  } finally {
    clearTimeout(timer);
  }
}
