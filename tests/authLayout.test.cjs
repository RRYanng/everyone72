const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadSource(relative) {
  const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', js)((id) => { throw new Error(`Unexpected dependency ${id}`); }, loaded, loaded.exports);
  return loaded.exports;
}
const L = loadSource('src/screens/auth/authLayout.ts');

test('split layout starts at 720px; below that the page is stacked and centred', () => {
  assert.equal(L.authLayout(719).mode, 'stacked');
  assert.equal(L.authLayout(720).mode, 'split');
  assert.equal(L.authLayout(390).mode, 'stacked');
  assert.equal(L.authLayout(1920).mode, 'split');
});

test('the art band is tall enough at every stacked width to keep the whole sun (H >= 0.525 W)', () => {
  for (let w = 280; w < L.SPLIT_BREAKPOINT; w += 7) {
    const { bandHeight } = L.authLayout(w);
    const visibleUnits = (400 * bandHeight) / w;           // 插画 viewBox 宽 400
    const wanted = Math.min(210, (400 * L.BAND_MAX_HEIGHT) / w);
    assert.ok(visibleUnits >= wanted - 0.5, `w=${w} h=${bandHeight} sees ${visibleUnits.toFixed(0)} units`);
    assert.ok(bandHeight >= L.BAND_MIN_HEIGHT && bandHeight <= L.BAND_MAX_HEIGHT);
  }
});

test('phones keep the original 232px band', () => {
  assert.equal(L.authLayout(390).bandHeight, 232);
});

test('split paddings stay in a sane range and the left side is roomier than the right', () => {
  for (const w of [720, 800, 1024, 1280, 1920, 3000]) {
    const l = L.authLayout(w);
    assert.ok(l.formPaddingLeft >= 28 && l.formPaddingLeft <= 88, `left @${w}`);
    assert.ok(l.formPaddingLeft >= l.formPaddingRight, `asymmetry @${w}`);
    assert.ok(l.artPadding >= 28 && l.artPadding <= 48, `art @${w}`);
    // 表单列在最窄的分栏下仍至少有 ~300px:面板宽 = 6/11 的屏宽
    const panel = (w * 6) / 11;
    assert.ok(panel - l.formPaddingLeft - l.formPaddingRight >= 280, `form width @${w}`);
  }
});
