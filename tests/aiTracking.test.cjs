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

const tracked = [];
let response;
const claude = loadSource('src/lib/claude.ts', {
  './parStreak': loadSource('src/lib/parStreak.ts'),
  './roundStats': loadSource('src/lib/roundStats.ts'),
  './analytics': { track: (name, props) => tracked.push({ name, props }) },
  './supabase': { supabase: { functions: { invoke: async () => response } } },
});

const stats = { water: 2, ob: 0, bunker: 1, rough: 0, other: 0, totalRounds: 3, byPar: { par3: 1, par4: 1, par5: 1 } };
const httpError = (body) => ({ data: null, error: { context: { json: async () => body } } });

test('a successful AI call records ai_result ok:true with its kind', async () => {
  tracked.length = 0;
  response = { data: { analysis: 'Keep the putter honest.' }, error: null };
  await claude.generateTroubleInsights(stats);
  assert.deepEqual(tracked, [{ name: 'ai_result', props: { kind: 'trouble', ok: true, truncated: false } }]);
});

test('a quota error records ok:false with the server code', async () => {
  tracked.length = 0;
  response = httpError({ code: 'quota_exceeded' });
  await assert.rejects(claude.generateTroubleInsights(stats));
  assert.deepEqual(tracked, [{ name: 'ai_result', props: { kind: 'trouble', ok: false, code: 'quota_exceeded' } }]);
});

test('an empty reply records ok:false, code ai_error', async () => {
  tracked.length = 0;
  response = { data: { analysis: '   ' }, error: null };
  await assert.rejects(claude.generateTroubleInsights(stats));
  assert.deepEqual(tracked, [{ name: 'ai_result', props: { kind: 'trouble', ok: false, code: 'ai_error' } }]);
});

test('the event carries no prompt text or user data', async () => {
  tracked.length = 0;
  response = { data: { analysis: 'ok' }, error: null };
  await claude.generateTroubleInsights(stats);
  assert.deepEqual(Object.keys(tracked[0].props).sort(), ['kind', 'ok', 'truncated']);
});
