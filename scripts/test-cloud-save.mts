import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { SaveStore } from '../server/store.ts';
import { createSaveServer } from '../server/http.ts';
import * as format from '../shared/cloudSave.ts';

const code = '我的存档-ABC123';
const entries = { [format.CLOUD_CODE_KEY]: code, 'island.quest-guide': 'on', 'island.multiplayer.resume': 'resume-token', 'island.display.landscape': 'on', 'island.future.setting': 'future' };
const bundle = { format: 'island-cloud-backup', version: 1, savedAt: Date.now(), entries };
assert.equal(format.normalizeCode('12345678901234567890'), '12345678901234567890');
for (const invalid of ['', 'a'.repeat(21), 'ab cd', 'ab\ncd', 'ab\u0000cd']) assert.throws(() => format.normalizeCode(invalid));
assert.throws(() => format.parseBundle(JSON.stringify({ ...bundle, entries: { foreign: 'no' } })));

// Run the production local restore logic with a quota failure and foreign site data.
let failOnce = false;
const storage: Record<string, unknown> = { unrelated: 'untouched', 'island.old': 'remove' };
Object.defineProperties(storage, {
  getItem: { value: (key: string) => storage[key] ?? null },
  setItem: { value: (key: string, value: string) => {
    if (failOnce && key === 'island.future.setting') { failOnce = false; throw new Error('quota'); }
    storage[key] = value;
  } },
  removeItem: { value: (key: string) => { delete storage[key]; } },
});
const source = readFileSync(new URL('../src/game/cloud/SaveBundle.ts', import.meta.url), 'utf8');
const context = vm.createContext({ exports: {}, localStorage: storage, TextEncoder, require: (name: string) => name.includes('SaveSystem') ? { SAVE_VERSION: 32 } : format });
vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
context.exports.restoreBundle(bundle);
assert.equal(storage.unrelated, 'untouched');
assert.equal(storage['island.old'], undefined);
assert.equal(storage['island.multiplayer.resume'], 'resume-token');
assert.equal(context.exports.captureBundle().entries['island.future.setting'], 'future');
storage['island.old'] = 'survive rollback';
const before = JSON.stringify(storage);
failOnce = true;
assert.throws(() => context.exports.restoreBundle(bundle), /已保留原数据/);
assert.deepEqual(JSON.parse(JSON.stringify(storage)), JSON.parse(before));
assert.throws(() => context.exports.restoreBundle({ ...bundle, entries: { ...entries, 'island.save.v1': '{' } }));
assert.deepEqual(JSON.parse(JSON.stringify(storage)), JSON.parse(before));

const directory = mkdtempSync(join(tmpdir(), 'island-cloud-test-'));
const filename = join(directory, 'saves.sqlite');
let store = new SaveStore(filename, 'test-only-secret-'.repeat(4));
const server = createSaveServer(store, 'test-sha');
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
const port = (server.address() as { port: number }).port;
const url = `http://127.0.0.1:${port}`;
const headers = { Authorization: `SaveCode ${encodeURIComponent(code)}`, 'Content-Type': 'application/json' };
try {
  assert.equal((await fetch(`${url}/api/health`)).status, 200);
  const preflight = await fetch(`${url}/api/save`, { method: 'OPTIONS', headers: { Origin: 'null', 'Access-Control-Request-Method': 'PUT' } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal((await fetch(`${url}/api/save`)).status, 401);
  assert.equal((await fetch(`${url}/api/save`, { headers })).status, 404);
  assert.equal((await fetch(`${url}/api/save`, { method: 'PUT', headers, body: JSON.stringify(bundle) })).status, 200);
  assert.deepEqual(await (await fetch(`${url}/api/save`, { headers })).json(), bundle);
  assert.equal((await fetch(`${url}/api/save`, { headers: { Authorization: 'SaveCode another-code' } })).status, 404);
  const replacement = { ...bundle, entries: { [format.CLOUD_CODE_KEY]: code, 'island.quest-guide': 'off' } };
  assert.equal((await fetch(`${url}/api/save`, { method: 'PUT', headers, body: JSON.stringify(replacement) })).status, 200);
  assert.deepEqual(await (await fetch(`${url}/api/save`, { headers })).json(), replacement);
  assert.equal((await fetch(`${url}/api/save`, { method: 'PUT', headers, body: '{bad' })).status, 400);
  assert.equal((await fetch(`${url}/api/save`, { method: 'PUT', headers, body: JSON.stringify({ ...bundle, entries: { ...entries, [format.CLOUD_CODE_KEY]: 'wrong' } }) })).status, 400);
  assert.deepEqual(await (await fetch(`${url}/api/save`, { headers })).json(), replacement);
  const tooLarge = JSON.stringify({ ...bundle, entries: { ...entries, 'island.large': 'x'.repeat(format.MAX_BYTES) } });
  assert.equal((await fetch(`${url}/api/save`, { method: 'PUT', headers, body: tooLarge })).status, 413);
  for (let i = 0; i < 31; i++) await fetch(`${url}/api/save`, { headers });
  assert.equal((await fetch(`${url}/api/save`, { headers })).status, 429);
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  store.close();
  store = new SaveStore(filename, 'test-only-secret-'.repeat(4));
  assert.deepEqual(JSON.parse(store.get(code)!), replacement);
  console.log('Cloud save: full restore, rollback, code validation, API isolation/overwrite, CORS, limits and restart persistence passed.');
} finally {
  if (server.listening) await new Promise<void>(resolve => server.close(() => resolve()));
  store.close();
  rmSync(directory, { recursive: true, force: true });
}
