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
const writes = [];
const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: null, error: null }),
  upsert: (...a) => { writes.push(['upsert', a]); return chain; }, update: (...a) => { writes.push(['update', a]); return chain; },
  insert: (...a) => { writes.push(['insert', a]); return chain; }, delete: (...a) => { writes.push(['delete', a]); return chain; } };
const S = loadSource('src/lib/streak.ts', {
  './supabase': { supabase: { from: () => chain } },
  '../types': {},
  './mockUser': { isDevMockActive: () => false, MOCK_USER_STATS: null },
});
const stats = (ids) => ({ badges: ids.map(id => ({ id, emoji: 'x', label: id, earned_at: 't' })) });

test('diffNewBadges returns only badges that were not there before', () => {
  assert.deepEqual(S.diffNewBadges(stats(['streak_3']), stats(['streak_3', 'streak_7'])).map(b => b.id), ['streak_7']);
  assert.deepEqual(S.diffNewBadges(stats(['a']), stats(['a'])), []);
  assert.deepEqual(S.diffNewBadges(null, stats(['streak_3'])).map(b => b.id), ['streak_3']);
  assert.deepEqual(S.diffNewBadges(stats(['a']), null), []);
  assert.deepEqual(S.diffNewBadges(null, null), []);
});

test('the client no longer has any way to write user_stats', () => {
  assert.equal(S.updateStreak, undefined);
  assert.equal(S.incrementAIPlansCompleted, undefined);
  const src = fs.readFileSync(path.join(__dirname, '..', 'src/lib/streak.ts'), 'utf8');
  assert.doesNotMatch(src, /\.(upsert|update|insert|delete)\(/);
});

test('no client code writes to user_stats, courses, or coach_waitlist directly', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const files = walk(path.join(__dirname, '..', 'src')).filter(f => /\.tsx?$/.test(f));
  const offenders = [];
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    for (const table of ['user_stats', 'courses', 'coach_waitlist']) {
      const re = new RegExp(`from\\(['"]${table}['"]\\)\\s*\\.(insert|update|upsert|delete)`, 's');
      if (re.test(t)) offenders.push(`${path.relative(path.join(__dirname, '..'), f)} → ${table}`);
    }
  }
  assert.deepEqual(offenders, []);
});
