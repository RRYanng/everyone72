const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadSource(relative, imports = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', js)((id) => {
    if (Object.hasOwn(imports, id)) return imports[id];
    throw new Error(`Unexpected runtime dependency: ${id}`);
  }, loaded, loaded.exports);
  return loaded.exports;
}

const UID = 'aa306c32-0feb-40e4-99f0-f3422d6a9d11';
let signCalls = [];
let signImpl = async (p) => ({ data: { signedUrl: `https://signed.example/${p}?token=t` }, error: null });
const load = () => loadSource('src/lib/photos.ts', {
  './supabase': { supabase: { storage: { from: (b) => ({ createSignedUrl: (p, ttl) => { signCalls.push({ b, p, ttl }); return signImpl(p); } }) } } },
});

test('a stored path resolves to a storage source', () => {
  const { resolvePhotoSource } = load();
  assert.deepEqual(resolvePhotoSource(`${UID}/1700000000000.jpg`), { kind: 'storage', path: `${UID}/1700000000000.jpg` });
});

test('old public URLs (saved before the bucket went private) resolve to their path, query string ignored', () => {
  const { resolvePhotoSource } = load();
  const old = `https://sgpalmmblxfqgbfamgwc.supabase.co/storage/v1/object/public/practice-photos/${UID}/1700000000000.jpg?t=123`;
  assert.deepEqual(resolvePhotoSource(old), { kind: 'storage', path: `${UID}/1700000000000.jpg` });
});

test('paths that could escape the user folder or point elsewhere are rejected', () => {
  const { resolvePhotoSource } = load();
  for (const bad of [`${UID}/../x.jpg`, `../${UID}/x.jpg`, `${UID}/sub/x.jpg`, 'not-a-uuid/x.jpg', `${UID}/`, '', '   ', null, undefined,
    `https://x.supabase.co/storage/v1/object/public/practice-photos/${UID}/../../etc.jpg`]) {
    assert.equal(resolvePhotoSource(bad), null, String(bad));
  }
});

test('an unrelated external URL is only returned when explicitly allowed (dev mock data)', async () => {
  const { resolvePhotoSource, getPhotoUrl } = load();
  const u = 'https://images.unsplash.com/photo-1?w=800';
  assert.deepEqual(resolvePhotoSource(u), { kind: 'external', url: u });
  assert.equal(await getPhotoUrl(u), null);
  assert.equal(await getPhotoUrl(u, { allowExternal: true }), u);
});

test('getPhotoUrl asks Storage for a 1-hour signed URL, and caches it', async () => {
  const { getPhotoUrl, clearPhotoCache } = load();
  clearPhotoCache(); signCalls = [];
  const v = `${UID}/1.jpg`;
  const a = await getPhotoUrl(v);
  const b = await getPhotoUrl(v);
  assert.equal(a, `https://signed.example/${v}?token=t`);
  assert.equal(a, b);
  assert.equal(signCalls.length, 1);
  assert.deepEqual(signCalls[0], { b: 'practice-photos', p: v, ttl: 3600 });
});

test('concurrent requests for the same photo share one signing call', async () => {
  const { getPhotoUrl, clearPhotoCache } = load();
  clearPhotoCache(); signCalls = [];
  const v = `${UID}/2.jpg`;
  await Promise.all([getPhotoUrl(v), getPhotoUrl(v), getPhotoUrl(v)]);
  assert.equal(signCalls.length, 1);
});

test('no permission / missing object / network failure → null, never throws, and failures are not cached', async () => {
  const { getPhotoUrl, clearPhotoCache } = load();
  clearPhotoCache();
  const v = `${UID}/3.jpg`;
  signImpl = async () => ({ data: null, error: { message: 'Object not found' } });
  assert.equal(await getPhotoUrl(v), null);
  signImpl = async () => { throw new Error('offline'); };
  assert.equal(await getPhotoUrl(v), null);
  signImpl = async (p) => ({ data: { signedUrl: 'https://signed.example/ok' }, error: null });
  assert.equal(await getPhotoUrl(v), 'https://signed.example/ok');
});

test('upload validation: > 5 MB and non-image types are refused with a readable reason', () => {
  const { validatePhoto, MAX_PHOTO_BYTES } = load();
  assert.equal(validatePhoto({ size: 1000, type: 'image/jpeg' }), null);
  assert.equal(validatePhoto({ size: MAX_PHOTO_BYTES, type: 'image/png' }), null);
  assert.match(validatePhoto({ size: MAX_PHOTO_BYTES + 1, type: 'image/jpeg' }), /too large/);
  assert.match(validatePhoto({ size: 10, type: 'application/pdf' }), /not supported/);
  assert.match(validatePhoto({ size: 10, type: 'text/html' }), /not supported/);
  assert.equal(validatePhoto({ size: 10, type: '' }), null);          // 有些浏览器给不出类型:交给服务端判断
});

test('content type falls back to JPEG when the browser gives none', () => {
  const { photoContentType } = load();
  assert.equal(photoContentType(''), 'image/jpeg');
  assert.equal(photoContentType(undefined), 'image/jpeg');
  assert.equal(photoContentType('IMAGE/PNG'), 'image/png');
  assert.equal(photoContentType('application/zip'), 'image/jpeg');
});
