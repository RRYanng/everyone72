const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadSource(relative, imports = {}, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', 'window', js)((id) => {
    if (Object.hasOwn(imports, id)) return imports[id];
    throw new Error(`Unexpected runtime dependency: ${id}`);
  }, loaded, loaded.exports, globals.window);
  return loaded.exports;
}

const { createDialogQueue } = loadSource('src/lib/dialogQueue.ts');
const base = { title: 't', confirmLabel: 'OK', cancelLabel: 'Cancel', destructive: false };

test('queue: confirm resolves true, cancel resolves false', async () => {
  const q = createDialogQueue();
  const a = q.push(base); q.settle(true);
  assert.equal(await a, true);
  const b = q.push(base); q.settle(false);
  assert.equal(await b, false);
  assert.equal(q.current(), null);
});

test('queue: dialogs are shown one at a time, in order', async () => {
  const q = createDialogQueue();
  const a = q.push({ ...base, title: 'first' });
  const b = q.push({ ...base, title: 'second' });
  assert.equal(q.current().title, 'first');
  q.settle(true);
  assert.equal(q.current().title, 'second');
  q.settle(false);
  assert.deepEqual([await a, await b], [true, false]);
});

test('queue: subscribers are notified on push and settle; unsubscribe stops it; settle on empty is a no-op', () => {
  const q = createDialogQueue();
  let n = 0;
  const off = q.subscribe(() => n++);
  assert.equal(q.hasHost(), true);
  void q.push(base); q.settle(true);
  assert.equal(n, 2);
  off();
  assert.equal(q.hasHost(), false);
  void q.push(base);
  assert.equal(n, 2);
  q.settle(true); q.settle(true);          // 第二次是空队列
  assert.equal(q.size(), 0);
});

function dialogWith(os, win) {
  return loadSource('src/lib/dialog.ts', {
    'react-native': { Platform: { OS: os }, Alert: { alert: (...a) => { dialogWith.alertCalls.push(a); } } },
    './dialogQueue': { createDialogQueue },
  }, { window: win });
}
dialogWith.alertCalls = [];

test('web with the in-app host: confirm waits for the user and never touches window.confirm', async () => {
  let nativeCalled = 0;
  const win = { confirm: () => { nativeCalled++; return false; }, alert: () => { nativeCalled++; } };
  const d = dialogWith('web', win);
  const off = d.dialogQueue.subscribe(() => {});          // 模拟 <DialogHost /> 已挂载
  const p = d.confirmAction('Delete this round?', 'msg', 'Delete', true);
  const shown = d.dialogQueue.current();
  assert.equal(shown.title, 'Delete this round?');
  assert.equal(shown.confirmLabel, 'Delete');
  assert.equal(shown.destructive, true);
  d.dialogQueue.settle(true);
  assert.equal(await p, true);
  assert.equal(nativeCalled, 0);
  off();
});

test('web with the host: a browser that silently returns false from confirm() no longer cancels the action', async () => {
  const win = { confirm: () => false, alert: () => {} };    // 内置浏览器的行为
  const d = dialogWith('web', win);
  const off = d.dialogQueue.subscribe(() => {});
  const p = d.confirmAction('Delete?', 'm', 'Delete', true);
  d.dialogQueue.settle(true);
  assert.equal(await p, true);
  off();
});

test('web with the host: notify shows a single-button dialog', () => {
  const d = dialogWith('web', { confirm: () => false, alert: () => { throw new Error('should not use window.alert'); } });
  const off = d.dialogQueue.subscribe(() => {});
  d.notify('Could not delete', 'Please try again.');
  const shown = d.dialogQueue.current();
  assert.equal(shown.cancelLabel, null);
  assert.equal(shown.message, 'Please try again.');
  off();
});

test('web before the host mounts: falls back to window.confirm / window.alert', async () => {
  const calls = [];
  const win = { confirm: (m) => { calls.push(['confirm', m]); return true; }, alert: (m) => { calls.push(['alert', m]); } };
  const d = dialogWith('web', win);
  assert.equal(await d.confirmAction('T', 'M'), true);
  d.notify('T2', 'M2');
  assert.deepEqual(calls, [['confirm', 'T\n\nM'], ['alert', 'T2\n\nM2']]);
});

test('native still uses Alert.alert, not the in-app queue', async () => {
  const d = dialogWith('ios', {});
  dialogWith.alertCalls.length = 0;
  d.notify('Hi', 'there');
  assert.deepEqual(dialogWith.alertCalls[0], ['Hi', 'there']);
  assert.equal(d.dialogQueue.size(), 0);
});
