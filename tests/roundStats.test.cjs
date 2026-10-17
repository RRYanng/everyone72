const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadSource(relative) {
  const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', js)(
    (id) => { throw new Error(`Unexpected runtime dependency: ${id}`); }, loaded, loaded.exports);
  return loaded.exports;
}

const { roundHoles, per18, averagePer18, handicap18, bestScores, formatBestScores } =
  loadSource('src/lib/roundStats.ts');

const r = (holes, strokes, putts, vsPar) => ({
  total_holes: holes, total_strokes: strokes, total_putts: putts, score_vs_par: vsPar,
});

test('missing or invalid hole counts default to 18', () => {
  assert.equal(roundHoles({}), 18);
  assert.equal(roundHoles({ total_holes: null }), 18);
  assert.equal(roundHoles({ total_holes: 0 }), 18);
  assert.equal(roundHoles({ total_holes: 9 }), 9);
});

test('per18 scales a nine-hole value to eighteen holes', () => {
  assert.equal(per18(38, 9), 76);
  assert.equal(per18(73, 18), 73);
});

test("Lan's real Home window: 73 (18) + 38 (9) + 71 (18)", () => {
  const rounds = [r(18, 73, 30, 1), r(9, 38, 15, 2), r(18, 71, 32, 0)];
  const strokes = averagePer18(rounds, x => x.total_strokes);
  assert.equal(Math.round(strokes.value), 73);              // was 61 when 9 and 18 were mixed
  assert.equal(strokes.approx, true);
  const putts = averagePer18(rounds, x => x.total_putts);
  assert.equal(Math.round(putts.value), 31);                // (30 + 30 + 32) / 3
});

test('all eighteen-hole rounds are exact, not approximate', () => {
  const avg = averagePer18([r(18, 70, 30, -2), r(18, 80, 34, 8)], x => x.total_strokes);
  assert.equal(avg.value, 75);
  assert.equal(avg.approx, false);
});

test('empty input and rounds without the field yield null', () => {
  assert.deepEqual(averagePer18([], x => x.total_strokes), { value: null, approx: false });
  assert.equal(averagePer18([{ total_holes: 18 }], x => x.total_strokes).value, null);
});

test('handicap scales vs-par: a nine-hole +2 counts as +4', () => {
  // raw (old behaviour): best half of [2,5,6] = (2+5)/2 = 3.5
  // scaled: [4,5,6] -> (4+5)/2 = 4.5
  assert.equal(handicap18([r(18, 78, 30, 6), r(9, 38, 15, 2), r(18, 77, 30, 5)]), 4.5);
});

test('handicap uses at most the best 8 rounds and the best half', () => {
  const rounds = Array.from({ length: 20 }, (_, i) => r(18, 72 + i, 30, i));   // vs par 0..19
  assert.equal(handicap18(rounds), 3.5);                                       // mean(0..7)
  assert.equal(handicap18([]), null);
});

test('best scores are kept separate for 18 and 9 holes and never scaled', () => {
  const rounds = [r(18, 73, 30, 1), r(9, 38, 15, 2), r(18, 71, 32, 0), r(9, 41, 17, 5)];
  assert.deepEqual(bestScores(rounds), { best18: 71, best9: 38 });
  assert.equal(formatBestScores(bestScores(rounds)), 'Best 18: 71 · Best 9: 38');
});

test('best scores: a missing kind shows a dash, odd hole counts are ignored', () => {
  assert.deepEqual(bestScores([r(18, 80, 33, 8)]), { best18: 80, best9: null });
  assert.equal(formatBestScores(bestScores([r(18, 80, 33, 8)])), 'Best 18: 80 · Best 9: —');
  assert.deepEqual(bestScores([r(12, 50, 20, 2)]), { best18: null, best9: null });
  assert.deepEqual(bestScores([]), { best18: null, best9: null });
});

test('handicap rounding matches the SQL function on a negative .5 tie (-0.25 -> -0.2, not -0.3)', () => {
  const rounds = [-1, 0, 0, 0, 5, 5, 5].map(v => r(18, 72 + v, 30, v));
  assert.equal(handicap18(rounds), -0.2);
});
