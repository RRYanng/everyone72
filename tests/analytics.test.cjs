const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadSource(relative, imports = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', js)((id) => {
    if (Object.hasOwn(imports, id)) return imports[id];
    throw new Error(`Unexpected runtime dependency: ${id}`);
  }, loaded, loaded.exports);
  return loaded.exports;
}

const rpcCalls = [];
let rpcImpl = async () => ({ data: true, error: null });
let devMock = false;
const load = () => loadSource('src/lib/analytics.ts', {
  'react-native': { Platform: { OS: 'web' } },
  './supabase': { supabase: { rpc: (name, args) => { rpcCalls.push({ name, args }); return rpcImpl(); } } },
  './mockUser': { isDevMockActive: () => devMock },
});

test('sanitizeProps keeps short strings, finite numbers, booleans; drops everything else', () => {
  const { sanitizeProps } = load();
  const out = sanitizeProps({
    kind: 'analysis', n: 3, ok: false, nan: NaN, inf: Infinity,
    obj: { a: 1 }, arr: [1], nul: null, undef: undefined, long: 'x'.repeat(100),
  });
  assert.deepEqual(Object.keys(out).sort(), ['kind', 'long', 'n', 'ok']);
  assert.equal(out.long.length, 40);
  assert.deepEqual(sanitizeProps(undefined), {});
});

test('sanitizeProps caps the number of keys at 8', () => {
  const { sanitizeProps } = load();
  const many = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`k${i}`, i]));
  assert.equal(Object.keys(sanitizeProps(many)).length, 8);
});

test('track sends the RPC with sanitized props and the platform', () => {
  const { track } = load();
  rpcCalls.length = 0;
  track('ai_result', { kind: 'plan', ok: true, secret: { email: 'a@b.c' } });
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].name, 'track_event');
  assert.deepEqual(rpcCalls[0].args, { p_name: 'ai_result', p_props: { kind: 'plan', ok: true }, p_platform: 'web' });
});

test('track is silent in dev-mock mode', () => {
  const { track } = load();
  rpcCalls.length = 0; devMock = true;
  track('login');
  devMock = false;
  assert.equal(rpcCalls.length, 0);
});

test('track never throws or rejects: network error, RPC error object, and a synchronous throw', async () => {
  const { track } = load();
  rpcImpl = async () => { throw new Error('offline'); };
  assert.doesNotThrow(() => track('login'));
  rpcImpl = async () => ({ data: null, error: { message: 'x' } });
  assert.doesNotThrow(() => track('login'));
  rpcImpl = () => { throw new Error('sync boom'); };
  assert.doesNotThrow(() => track('login'));
  await new Promise(r => setImmediate(r));   // 若有未处理的 rejection,测试进程会失败
  rpcImpl = async () => ({ data: true, error: null });
});

test('trackAppOpenOnce records app_open exactly once per app load', () => {
  const { trackAppOpenOnce } = load();
  rpcCalls.length = 0;
  trackAppOpenOnce(); trackAppOpenOnce(); trackAppOpenOnce();
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].args.p_name, 'app_open');
});
