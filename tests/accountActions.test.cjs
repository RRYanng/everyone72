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

let invokeResult = { error: null };
const calls = [];
const store = new Map();
const { isDeleteConfirmed, DELETE_CONFIRM_WORD, accountErrorMessage, AccountError, deleteAccountRemote, clearLocalUserData } =
  loadSource('src/lib/accountActions.ts', {
    'react-native': { Platform: { OS: 'native' } },
    '@react-native-async-storage/async-storage': {
      default: {
        getAllKeys: async () => [...store.keys()],
        multiRemove: async (keys) => keys.forEach(k => store.delete(k)),
      },
    },
    './supabase': { supabase: { functions: { invoke: async (name, opts) => { calls.push({ name, opts }); return invokeResult; } } } },
  });

test('only the exact word DELETE confirms (surrounding spaces ignored, case sensitive)', () => {
  assert.equal(isDeleteConfirmed('DELETE'), true);
  assert.equal(isDeleteConfirmed('  DELETE '), true);
  for (const bad of ['', 'delete', 'Delete', 'DELET', 'DELETE!', 'DELETE ME']) assert.equal(isDeleteConfirmed(bad), false, bad);
});

test('the client sends the same confirmation word the server demands', async () => {
  invokeResult = { error: null };
  await deleteAccountRemote();
  assert.equal(calls.at(-1).name, 'delete-account');
  assert.deepEqual(calls.at(-1).opts.body, { confirm: DELETE_CONFIRM_WORD });
  assert.equal(DELETE_CONFIRM_WORD, 'DELETE');
});

test('server error codes are mapped; anything unknown becomes "unavailable"', async () => {
  const fail = (body, jsonThrows) => ({ error: { context: { json: async () => { if (jsonThrows) throw new Error('x'); return body; } } } });
  for (const [res, code] of [
    [fail({ code: 'unauthorized' }), 'unauthorized'],
    [fail({ code: 'storage_failed' }), 'storage_failed'],
    [fail({ code: 'prepare_failed' }), 'prepare_failed'],
    [fail({ code: 'delete_failed' }), 'delete_failed'],
    [fail({ code: 'something_else' }), 'unavailable'],
    [fail(null, true), 'unavailable'],
    [{ error: new Error('network') }, 'unavailable'],
  ]) {
    invokeResult = res;
    await assert.rejects(deleteAccountRemote(), (e) => e instanceof AccountError && e.code === code, code);
  }
});

test('error messages are human and never leak codes', () => {
  assert.match(accountErrorMessage(new AccountError('unauthorized')), /sign in again/i);
  assert.match(accountErrorMessage(new AccountError('storage_failed')), /Nothing was lost/);
  assert.match(accountErrorMessage(new Error('boom')), /unavailable/i);
});

test('local cleanup removes only this user\'s drafts', async () => {
  store.set('scorecard_draft_u1_c1', 'x'); store.set('scorecard_draft_u1_c2', 'x');
  store.set('scorecard_draft_u2_c1', 'x'); store.set('other', 'x');
  await clearLocalUserData('u1');
  assert.deepEqual([...store.keys()].sort(), ['other', 'scorecard_draft_u2_c1']);
});
