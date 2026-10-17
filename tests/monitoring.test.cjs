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
  new Function('require', 'module', 'exports', '__DEV__', 'process', js)((id) => {
    if (Object.hasOwn(imports, id)) return imports[id];
    throw new Error(`Unexpected runtime dependency: ${id}`);
  }, loaded, loaded.exports, false, { env: imports.__env ?? {} });
  return loaded.exports;
}

const sentryCalls = { init: [], captured: [], user: [] };
const sentry = {
  init: (o) => sentryCalls.init.push(o),
  captureException: (e, ctx) => sentryCalls.captured.push({ e, ctx }),
  setUser: (u) => sentryCalls.user.push(u),
};
const constants = { default: { expoConfig: { version: '1.2.3' } } };
const load = (env) => loadSource('src/lib/monitoring.ts', {
  '@sentry/react-native': sentry, 'expo-constants': constants, __env: env,
});

test('stripUrl removes query strings and fragments (login callbacks can carry tokens)', () => {
  const { stripUrl } = load({});
  assert.equal(stripUrl('https://x.app/cb?code=abc#access_token=secret'), 'https://x.app/cb');
  assert.equal(stripUrl('https://x.app/#access_token=secret'), 'https://x.app/');
  assert.equal(stripUrl('https://x.app/plain'), 'https://x.app/plain');
  assert.equal(stripUrl(undefined), undefined);
});

test('scrubEvent keeps only the anonymous user id and drops cookies, headers, bodies and query strings', () => {
  const { scrubEvent } = load({});
  const out = scrubEvent({
    user: { id: 'u1', email: 'a@b.c', ip_address: '1.2.3.4', username: 'alice' },
    request: { url: 'https://x.app/p?token=1#frag', cookies: { s: '1' }, headers: { Authorization: 'Bearer z' }, data: { pw: 'x' }, query_string: 'token=1' },
    breadcrumbs: [
      { category: 'console', message: 'user email a@b.c' },
      { category: 'navigation', data: { from: '/a?x=1', to: '/b#y' } },
      { category: 'fetch', data: { url: 'https://api/rest?apikey=k' } },
    ],
  });
  assert.deepEqual(out.user, { id: 'u1' });
  assert.equal(out.request.url, 'https://x.app/p');
  for (const k of ['cookies', 'headers', 'data', 'query_string']) assert.equal(k in out.request, false, k);
  assert.equal(out.breadcrumbs.length, 2, 'console breadcrumbs dropped');
  assert.deepEqual(out.breadcrumbs[0].data, { from: '/a', to: '/b' });
  assert.equal(out.breadcrumbs[1].data.url, 'https://api/rest');
});

test('scrubEvent: a user with no id is dropped entirely; events without optional parts are fine', () => {
  const { scrubEvent } = load({});
  assert.equal(scrubEvent({ user: { email: 'a@b.c' } }).user, undefined);
  assert.deepEqual(scrubEvent({ message: 'x' }), { message: 'x' });
});

test('without a DSN nothing is initialised and every call is a safe no-op', () => {
  sentryCalls.init.length = sentryCalls.captured.length = sentryCalls.user.length = 0;
  const m = load({});
  const origErr = console.error; console.error = () => {};
  try { m.initMonitoring(); m.captureError(new Error('x')); m.setMonitoringUser('u1'); } finally { console.error = origErr; }
  assert.equal(sentryCalls.init.length, 0);
  assert.equal(sentryCalls.captured.length, 0);
  assert.equal(sentryCalls.user.length, 0);
});

test('with a DSN: PII off, no tracing, release tagged, errors and the anonymous id are forwarded', () => {
  sentryCalls.init.length = sentryCalls.captured.length = sentryCalls.user.length = 0;
  const m = load({ EXPO_PUBLIC_SENTRY_DSN: 'https://k@o1.ingest.sentry.io/1' });
  const origErr = console.error; console.error = () => {};
  try {
    m.initMonitoring();
    const o = sentryCalls.init[0];
    assert.equal(o.dsn, 'https://k@o1.ingest.sentry.io/1');
    assert.equal(o.sendDefaultPii, false);
    assert.equal(o.tracesSampleRate, 0);
    assert.equal(o.release, 'everyone72@1.2.3');
    assert.equal(o.environment, 'production');
    assert.equal(o.beforeSend({ user: { id: 'u', email: 'e' } }).user.email, undefined);
    m.captureError(new Error('boom'), { componentStack: 'at X' });
    m.setMonitoringUser('u1'); m.setMonitoringUser(null);
  } finally { console.error = origErr; }
  assert.equal(sentryCalls.captured[0].e.message, 'boom');
  assert.deepEqual(sentryCalls.captured[0].ctx, { extra: { componentStack: 'at X' } });
  assert.deepEqual(sentryCalls.user, [{ id: 'u1' }, null]);
});

test('a Sentry SDK failure never propagates into the app', () => {
  const m = loadSource('src/lib/monitoring.ts', {
    '@sentry/react-native': { init: () => { throw new Error('init'); }, captureException: () => { throw new Error('cap'); }, setUser: () => { throw new Error('u'); } },
    'expo-constants': constants, __env: { EXPO_PUBLIC_SENTRY_DSN: 'https://k@o1.ingest.sentry.io/1' },
  });
  const origErr = console.error, origWarn = console.warn; console.error = () => {}; console.warn = () => {};
  try { m.initMonitoring(); m.captureError(new Error('x')); m.setMonitoringUser('u'); } finally { console.error = origErr; console.warn = origWarn; }
});
