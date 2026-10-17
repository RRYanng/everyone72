// 运行:
//   docker run --rm -v "$PWD/supabase/functions/delete-account":/app -w /app denoland/deno:alpine deno test handler_test.ts
// 全部使用注入的假 fetch,不访问网络。

import { handle, type Env } from './handler.ts';

const UID = '11111111-1111-4111-8111-111111111111';
const env: Env = {
  supabaseUrl: 'https://proj.supabase.co',
  anonKey: 'anon-key',
  serviceKey: 'service-key',
  allowedOrigins: ['https://everyone72.vercel.app'],
};

function ok(cond: unknown, msg: string) { if (!cond) throw new Error('FAIL: ' + msg); }
function eq<T>(a: T, b: T, msg: string) { if (a !== b) throw new Error(`FAIL: ${msg} (got ${String(a)}, want ${String(b)})`); }

interface Calls { order: string[]; adminDeleteUrl?: string; deleted: string[][]; prepareBody?: Record<string, unknown> }

function makeFetch(o: {
  authStatus?: number; userId?: string; authThrows?: boolean;
  prepareStatus?: number; prepareThrows?: boolean;
  files?: string[];                 // 存储里该用户的文件名;删除后会从列表里消失
  listStatus?: number; deleteStatus?: number; stuckStorage?: boolean;
  adminStatus?: number;
} = {}) {
  const calls: Calls = { order: [], deleted: [] };
  let files = [...(o.files ?? [])];
  const f = (async (input: Request | URL | string, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (url.endsWith('/auth/v1/user')) {
      calls.order.push('auth');
      if (o.authThrows) throw new Error('down');
      const s = o.authStatus ?? 200;
      return new Response(JSON.stringify(s === 200 ? { id: o.userId ?? UID } : { msg: 'bad' }), { status: s });
    }
    if (url.endsWith('/rest/v1/rpc/prepare_account_deletion')) {
      calls.order.push('prepare');
      if (o.prepareThrows) throw new Error('db down');
      calls.prepareBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ crews_transferred: 1 }), { status: o.prepareStatus ?? 200 });
    }
    if (url.includes('/storage/v1/object/list/practice-photos')) {
      calls.order.push('list');
      const body = JSON.parse(String(init?.body));
      eq(body.prefix, UID, 'list prefix is the caller uid');
      if (o.listStatus && o.listStatus !== 200) return new Response('{}', { status: o.listStatus });
      return new Response(JSON.stringify(files.map((name) => ({ id: 'x-' + name, name }))), { status: 200 });
    }
    if (method === 'DELETE' && url.endsWith('/storage/v1/object/practice-photos')) {
      calls.order.push('purge');
      if (o.deleteStatus && o.deleteStatus !== 200) return new Response('{}', { status: o.deleteStatus });
      const prefixes: string[] = JSON.parse(String(init?.body)).prefixes;
      calls.deleted.push(prefixes);
      if (!o.stuckStorage) files = files.filter((n) => !prefixes.includes(`${UID}/${n}`));
      return new Response('[]', { status: 200 });
    }
    if (method === 'DELETE' && url.includes('/auth/v1/admin/users/')) {
      calls.order.push('admin');
      calls.adminDeleteUrl = url;
      return new Response('{}', { status: o.adminStatus ?? 200 });
    }
    throw new Error('unexpected fetch ' + method + ' ' + url);
  }) as typeof fetch;
  return { f, calls };
}

function req(body: unknown = { confirm: 'DELETE' }, headers: Record<string, string> = {}, method = 'POST') {
  return new Request('https://x/functions/v1/delete-account', {
    method,
    headers: { Authorization: 'Bearer ' + 'a'.repeat(40), 'Content-Type': 'application/json', ...headers },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
}

Deno.test('happy path: auth -> prepare -> purge photos -> delete user, in that order', async () => {
  const { f, calls } = makeFetch({ files: ['1.jpg', '2.jpg'] });
  const res = await handle(req(), env, f);
  eq(res.status, 200, 'status');
  const b = await res.json();
  eq(b.ok, true, 'ok');
  eq(b.photos_removed, 2, 'photos removed');
  eq(calls.order.join(','), 'auth,prepare,list,purge,list,admin', 'order');
  eq(calls.prepareBody?.p_user, UID, 'prepare receives the verified uid');
  ok(calls.adminDeleteUrl!.endsWith(`/auth/v1/admin/users/${UID}`), 'admin delete targets the verified uid');
  eq(calls.deleted[0].join('|'), `${UID}/1.jpg|${UID}/2.jpg`, 'only caller-prefixed paths are deleted');
});

Deno.test('works for an account with no photos', async () => {
  const { f, calls } = makeFetch();
  const res = await handle(req(), env, f);
  eq(res.status, 200, 'status');
  eq(calls.order.join(','), 'auth,prepare,list,admin', 'no purge call');
});

Deno.test('uid always comes from the verified JWT, never from the body', async () => {
  const { f, calls } = makeFetch();
  await handle(req({ confirm: 'DELETE', user_id: '22222222-2222-4222-8222-222222222222', userId: 'x' }), env, f);
  ok(calls.adminDeleteUrl!.endsWith(UID), 'still deletes the caller');
  eq(calls.prepareBody?.p_user, UID, 'prepare uses the caller');
});

Deno.test('missing / garbage / rejected token -> 401 and nothing is touched', async () => {
  for (const [headers, auth] of [
    [{ Authorization: '' }, 200], [{ Authorization: 'Bearer short' }, 200], [{}, 401],
  ] as const) {
    const { f, calls } = makeFetch({ authStatus: auth });
    const res = await handle(req({ confirm: 'DELETE' }, { ...headers }), env, f);
    eq(res.status, 401, 'status ' + JSON.stringify(headers));
    ok(!calls.order.includes('prepare') && !calls.order.includes('admin'), 'no mutation');
  }
});

Deno.test('auth service unreachable -> 503, nothing deleted', async () => {
  const { f, calls } = makeFetch({ authThrows: true });
  const res = await handle(req(), env, f);
  eq(res.status, 503, 'status');
  ok(!calls.order.includes('admin'), 'no delete');
});

Deno.test('a non-uuid id from auth is refused (path-injection guard)', async () => {
  const { f, calls } = makeFetch({ userId: '../../admin' });
  const res = await handle(req(), env, f);
  eq(res.status, 401, 'status');
  ok(!calls.order.includes('admin'), 'no delete');
});

Deno.test('without the explicit confirmation -> 400, nothing deleted', async () => {
  for (const body of [{}, { confirm: 'delete' }, { confirm: true }, { confirm: '' }]) {
    const { f, calls } = makeFetch();
    const res = await handle(req(body), env, f);
    eq(res.status, 400, 'status ' + JSON.stringify(body));
    ok(!calls.order.includes('prepare') && !calls.order.includes('admin'), 'no mutation');
  }
  const { f } = makeFetch();
  const bad = new Request('https://x/', { method: 'POST', headers: { Authorization: 'Bearer ' + 'a'.repeat(40) }, body: 'not json' });
  eq((await handle(bad, env, f)).status, 400, 'bad json');
});

Deno.test('prepare failure keeps the account intact', async () => {
  for (const o of [{ prepareStatus: 500 }, { prepareThrows: true }]) {
    const { f, calls } = makeFetch(o);
    const res = await handle(req(), env, f);
    eq(res.status, 500, 'status');
    eq((await res.json()).code, 'prepare_failed', 'code');
    ok(!calls.order.includes('admin') && !calls.order.includes('purge'), 'nothing destructive after a failed prepare');
  }
});

Deno.test('storage failure keeps the account intact so the user can retry', async () => {
  for (const o of [{ files: ['1.jpg'], listStatus: 500 }, { files: ['1.jpg'], deleteStatus: 500 }]) {
    const { f, calls } = makeFetch(o);
    const res = await handle(req(), env, f);
    eq(res.status, 500, 'status');
    eq((await res.json()).code, 'storage_failed', 'code');
    ok(!calls.order.includes('admin'), 'account NOT deleted while photos remain');
  }
});

Deno.test('storage that never empties is bounded, not an infinite loop', async () => {
  const { f, calls } = makeFetch({ files: ['1.jpg'], stuckStorage: true });
  const res = await handle(req(), env, f);
  eq(res.status, 500, 'status');
  ok(!calls.order.includes('admin'), 'account NOT deleted');
  ok(calls.deleted.length <= 50, 'bounded');
});

Deno.test('admin delete: failure -> 500; already-deleted (404) -> success (idempotent retry)', async () => {
  const fail = makeFetch({ adminStatus: 500 });
  const r1 = await handle(req(), env, fail.f);
  eq(r1.status, 500, 'status');
  eq((await r1.json()).code, 'delete_failed', 'code');
  const gone = makeFetch({ adminStatus: 404 });
  eq((await handle(req(), env, gone.f)).status, 200, 'idempotent');
});

Deno.test('CORS: allowed origin echoed, unknown origin not; preflight ok; GET refused', async () => {
  const { f } = makeFetch();
  const good = await handle(req({ confirm: 'DELETE' }, { Origin: 'https://everyone72.vercel.app' }), env, f);
  eq(good.headers.get('Access-Control-Allow-Origin'), 'https://everyone72.vercel.app', 'allowed');
  const bad = await handle(req({ confirm: 'DELETE' }, { Origin: 'https://evil.example' }), env, makeFetch().f);
  eq(bad.headers.get('Access-Control-Allow-Origin'), null, 'blocked');
  eq((await handle(new Request('https://x/', { method: 'OPTIONS' }), env, f)).status, 200, 'preflight');
  eq((await handle(new Request('https://x/', { method: 'GET' }), env, f)).status, 405, 'GET');
});
