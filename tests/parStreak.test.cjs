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

const facts = loadSource('src/lib/parStreak.ts');
const pars = [4, 4, 3, 4, 4, 5, 4, 3, 5];
const holes = pars.map((par, i) => ({ round_id: 'regression', hole_number: i + 1,
  par, strokes: i === 0 ? 6 : par, putts: i === 0 ? 3 : 2, troubles: i === 0 ? ['water'] : [] }));

test('saved nine-hole regression has eight consecutive pars, not seven', () => {
  assert.deepEqual(facts.getLongestParStreak(holes), { length: 8, start: 2, end: 9 });
  assert.deepEqual(facts.getLongestParStreak([...holes].reverse()), { length: 8, start: 2, end: 9 });
});

test('streaks end at non-par holes and missing hole numbers', () => {
  const input = [1, 2, 4, 5, 6, 7, 8].map(n => ({ hole_number: n, par: 4, strokes: n === 6 ? 5 : 4 }));
  assert.deepEqual(facts.getLongestParStreak(input), { length: 2, start: 1, end: 2 });
  assert.deepEqual(facts.getLongestParStreak([]), { length: 0, start: 0, end: 0 });
  assert.equal(facts.getLongestParStreak(input.map(h => ({ ...h, strokes: 5 }))).length, 0);
});

test('corrects both observed false claims without changing scores, putts or drill counts', () => {
  const bad = '38 (+2), 19 putts. **seven consecutive pars**; seven-hole par streak. Roll 7 long putts.';
  const fixed = '38 (+2), 19 putts. **8 consecutive pars**; 8-hole par streak. Roll 7 long putts.';
  assert.equal(facts.correctParStreakCounts(bad, holes), fixed);
  assert.equal(facts.hasIncorrectParStreakCount(bad, holes), true);
  assert.equal(facts.hasIncorrectParStreakCount(fixed, holes), false);
  assert.equal(facts.correctParStreakCounts('eight consecutive pars', holes), 'eight consecutive pars');
});

test('putting facts distinguish two-putt holes from their actual putt total', () => {
  const fullRound = Array.from({ length: 18 }, (_, i) => ({ hole_number: i + 1,
    par: 4, strokes: i === 17 ? 5 : 4, putts: i === 17 ? 3 : 2 }));
  const bad = '17 consecutive pars. 36 of your 37 putts were clean two-putters. Practice 36 putts.';
  const fixed = '17 consecutive pars. 34 of your 37 putts were clean two-putters. Practice 36 putts.';
  assert.deepEqual(facts.getPuttingFacts(fullRound), { twoPuttHoles: 17, twoPuttStrokes: 34, totalPutts: 37 });
  assert.equal(facts.correctRoundFactCounts(bad, fullRound), fixed);
  assert.equal(facts.hasIncorrectRoundFactCount(bad, fullRound), true);
  assert.equal(facts.hasIncorrectRoundFactCount(fixed, fullRound), false);
});

test('prompt provides partial-round facts and provider output is checked before saving', async () => {
  let request;
  const client = loadSource('src/lib/claude.ts', {
    './parStreak': facts,
    './supabase': { supabase: { functions: { invoke: async (name, args) => {
      request = { name, args };
      return { data: { analysis: '38 (+2), 19 putts, seven consecutive pars.' }, error: null };
    } } } },
  });
  const round = { total_strokes: 38, total_putts: 19, score_vs_par: 2 };
  const course = { name: 'Torrey Pines South', city: 'La Jolla', state: 'CA',
    course_rating: 76.9, slope_rating: 145, total_par: 72 };
  const result = await client.analyzeRound(round, holes, course);
  assert.equal(result, '38 (+2), 19 putts, 8 consecutive pars.');
  assert.equal(request.name, 'analyze-round');
  assert.match(request.args.body.prompt, /Holes played: 9; played-hole par: 36/);
  assert.match(request.args.body.prompt, /Total par holes: 8/);
  assert.match(request.args.body.prompt, /Longest par streak: 8 consecutive pars \(holes #2 through #9, inclusive\)/);
  assert.doesNotMatch(result, /Offline fallback/);
});
