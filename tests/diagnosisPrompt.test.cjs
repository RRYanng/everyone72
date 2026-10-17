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

const roundStats = loadSource('src/lib/roundStats.ts');
const parStreak = loadSource('src/lib/parStreak.ts');
const { buildDiagnosisPrompt } = loadSource('src/lib/claude.ts', {
  './supabase': { supabase: {} },          // 构建 prompt 不会用到网络
  './analytics': { track: () => {} },
  './parStreak': parStreak,
  './roundStats': roundStats,
});

const round = (id, holes, strokes, putts, vsPar) => ({
  id, user_id: 'u', course_id: 'c', date: '2026-10-01', total_holes: holes,
  total_strokes: strokes, total_putts: putts, score_vs_par: vsPar, created_at: '2026-10-0' + id.slice(1) + 'T10:00:00Z',
});
// n 洞的逐洞数据;troubleOn 里的洞号带一次 water
const holesFor = (id, n, troubleOn = []) => Array.from({ length: n }, (_, i) => ({
  round_id: id, hole_number: i + 1, par: 4, strokes: 5, putts: 2,
  troubles: troubleOn.includes(i + 1) ? ['water'] : [],
}));

// 和线上账号同样的形状:18 洞 73(+1)/ 9 洞 38(+2)/ 18 洞 71(0)
const mixed = [round('r1', 18, 73, 30, 1), round('r2', 9, 38, 15, 2), round('r3', 18, 71, 32, 0)];
const mixedHoles = [...holesFor('r1', 18, [3]), ...holesFor('r2', 9, [5]), ...holesFor('r3', 18, [7])];  // 3 次障碍 / 45 洞

test('per-round table keeps the real totals and now says how many holes each round was', () => {
  const p = buildDiagnosisPrompt(mixed, mixedHoles);
  assert.match(p, /\| Holes \| Score \| vs Par \| Putts \|/);
  assert.match(p, /\| 2 \| .* \| 9 \| 38 \| \+2 \| 15 \|/);          // 9 洞那轮:真实的 38 / +2 / 15
  assert.match(p, /\| 1 \| .* \| 18 \| 73 \| \+1 \| 30 \|/);
});

test('aggregates are normalized to 18 holes and flagged as estimates', () => {
  const p = buildDiagnosisPrompt(mixed, mixedHoles);
  assert.match(p, /\(all 3 rounds, 1 of them 9-hole\)/);
  assert.match(p, /normalized to 18 holes .* estimates/);
  assert.match(p, /Average score vs par per 18 holes: \+1\.7/);      // (1 + 4 + 0) / 3
  assert.match(p, /Average putts per 18 holes: 30\.7/);              // (30 + 30 + 32) / 3
  assert.match(p, /Trouble incidents: 1\.2 per 18 holes \(3 total over 45 holes\)/);  // 3 / 45 * 18
});

test('the old mixed-up wording is gone', () => {
  const p = buildDiagnosisPrompt(mixed, mixedHoles);
  assert.doesNotMatch(p, /Average putts per round/);
  assert.doesNotMatch(p, /Average score vs par: /);
  assert.doesNotMatch(p, /\/round \(/);
});

test('all eighteen-hole rounds: exact averages, no estimate warning', () => {
  const rounds = [round('r1', 18, 80, 34, 8), round('r2', 18, 76, 32, 4)];
  const p = buildDiagnosisPrompt(rounds, [...holesFor('r1', 18), ...holesFor('r2', 18)]);
  assert.doesNotMatch(p, /of them 9-hole/);   // 汇总标题里不提 9 洞
  assert.doesNotMatch(p, /estimates/);
  assert.match(p, /Average score vs par per 18 holes: \+6\b/);
  assert.match(p, /Average putts per 18 holes: 33\b/);
});
