// ============================================================
// delete-account 的请求处理逻辑(纯函数,依赖由调用方注入,便于单测)
//
// 用户在 App 里点"删除账号"后,按顺序做四件事:
//   1. 用用户自己的 JWT 向 Supabase Auth 确认身份(不信任请求体里的任何 id)。
//   2. prepare_account_deletion(service_role):转让有其他成员的 Crew、清除候补名单邮箱。
//   3. 清理 Storage 里 practice-photos/<uid>/ 下的所有照片(外键级联不会碰 Storage)。
//   4. 用 service_role 删除 auth 用户 —— profiles / rounds / 练习 / 好友 / 约球 等
//      全部靠外键 ON DELETE CASCADE 一并清理。
//
// 顺序有意把"删除账号本身"放在最后:前面任何一步失败都返回错误、账号保持完好,
// 用户可以直接重试;所有步骤都是幂等的。
// ============================================================

export interface Env {
  supabaseUrl: string;
  anonKey: string;
  serviceKey: string;
  allowedOrigins: string[];
}

export const PHOTO_BUCKET = 'practice-photos';
const LIST_PAGE = 100;
const MAX_STORAGE_PAGES = 50;      // 最多清 5000 张,防止异常情况下死循环
const TIMEOUT_MS = 20000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/** 带超时的 fetch。 */
async function timed(f: Fetch, url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await f(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** 删除 practice-photos/<uid>/ 下的全部文件;返回删除数量,失败则抛错。 */
export async function purgePhotos(env: Env, userId: string, f: Fetch): Promise<number> {
  const svc = { apikey: env.serviceKey, Authorization: `Bearer ${env.serviceKey}`, 'Content-Type': 'application/json' };
  let removed = 0;
  for (let page = 0; page < MAX_STORAGE_PAGES; page++) {
    const list = await timed(f, `${env.supabaseUrl}/storage/v1/object/list/${PHOTO_BUCKET}`, {
      method: 'POST',
      headers: svc,
      body: JSON.stringify({ prefix: userId, limit: LIST_PAGE, offset: 0 }),
    });
    if (!list.ok) throw new Error(`storage list ${list.status}`);
    const items = await list.json();
    const names: string[] = Array.isArray(items)
      ? items.filter((i: { id?: unknown; name?: unknown }) => i && i.id && typeof i.name === 'string')
             .map((i: { name: string }) => `${userId}/${i.name}`)
      : [];
    if (names.length === 0) return removed;

    const del = await timed(f, `${env.supabaseUrl}/storage/v1/object/${PHOTO_BUCKET}`, {
      method: 'DELETE',
      headers: svc,
      body: JSON.stringify({ prefixes: names }),
    });
    if (!del.ok) throw new Error(`storage delete ${del.status}`);
    removed += names.length;
  }
  throw new Error('storage purge exceeded page limit');
}

export async function handle(req: Request, env: Env, fetchImpl: Fetch = fetch): Promise<Response> {
  const cors = corsHeaders(req.headers.get('Origin'), env.allowedOrigins);
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { code: 'method_not_allowed' });

  // 1. 验证身份
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ') || authHeader.length < 20) return json(401, { code: 'unauthorized' });
  let userId: string | null = null;
  try {
    const r = await timed(fetchImpl, `${env.supabaseUrl}/auth/v1/user`, {
      headers: { apikey: env.anonKey, Authorization: authHeader },
    });
    if (r.ok) {
      const u = await r.json();
      if (typeof u?.id === 'string' && UUID_RE.test(u.id)) userId = u.id;
    }
  } catch (e) {
    console.error('[delete-account] auth check failed:', e);
    return json(503, { code: 'auth_unavailable' });
  }
  if (!userId) return json(401, { code: 'unauthorized' });

  // 2. 服务端也要求显式确认,防止脚本或误调用
  let confirm: unknown;
  try {
    ({ confirm } = await req.json());
  } catch {
    return json(400, { code: 'bad_request' });
  }
  if (confirm !== 'DELETE') return json(400, { code: 'confirmation_required' });

  const svc = { apikey: env.serviceKey, Authorization: `Bearer ${env.serviceKey}`, 'Content-Type': 'application/json' };

  // 3. 删库前的整理(转让 Crew、清候补名单)
  let prepared: unknown = null;
  try {
    const p = await timed(fetchImpl, `${env.supabaseUrl}/rest/v1/rpc/prepare_account_deletion`, {
      method: 'POST', headers: svc, body: JSON.stringify({ p_user: userId }),
    });
    if (!p.ok) {
      console.error('[delete-account] prepare status', p.status);
      return json(500, { code: 'prepare_failed' });
    }
    prepared = await p.json();
  } catch (e) {
    console.error('[delete-account] prepare failed:', e);
    return json(500, { code: 'prepare_failed' });
  }

  // 4. 清理照片
  let photos = 0;
  try {
    photos = await purgePhotos(env, userId, fetchImpl);
  } catch (e) {
    console.error('[delete-account] storage purge failed:', e);
    return json(500, { code: 'storage_failed' });
  }

  // 5. 删除账号本身(级联清理其余数据)。404 = 已经删过,按成功处理(幂等)。
  try {
    const d = await timed(fetchImpl, `${env.supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE', headers: svc, body: JSON.stringify({ should_soft_delete: false }),
    });
    if (!d.ok && d.status !== 404) {
      console.error('[delete-account] admin delete status', d.status);
      return json(500, { code: 'delete_failed' });
    }
  } catch (e) {
    console.error('[delete-account] admin delete failed:', e);
    return json(500, { code: 'delete_failed' });
  }

  return json(200, { ok: true, photos_removed: photos, prepared });
}
