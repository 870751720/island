import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(name: string, globals: Record<string, unknown> = {}) {
  const source = fs.readFileSync(new URL(`../src/platform/compat/${name}.ts`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const context = vm.createContext({ exports: {}, ...globals });
  vm.runInContext(code, context);
  return context.exports;
}

const { roundedRectPath } = load('canvas');
const arcs: number[][] = [];
let closed = false;
const ctx = { beginPath() {}, moveTo() {}, arcTo(...args: number[]) { arcs.push(args); }, closePath() { closed = true; } };
roundedRectPath(ctx, 8, 6, 240, 52, 24);
assert.equal(arcs.length, 4);
assert.ok(arcs.every(args => args[4] === 24));
assert.ok(closed);
arcs.length = 0;
roundedRectPath(ctx, 0, 0, 10, 6, 99);
assert.ok(arcs.every(args => args[4] === 3));
let nativeCalls = 0;
roundedRectPath({ ...ctx, roundRect() { nativeCalls++; } }, 0, 0, 10, 10, 2);
assert.equal(nativeCalls, 1);

const { createUuid } = load('identity', { crypto: { getRandomValues(bytes: Uint8Array) { return bytes.fill(255); } } });
assert.equal(createUuid(), 'ffffffff-ffff-4fff-bfff-ffffffffffff');
assert.throws(() => load('identity').createUuid(), /安全随机数/);
assert.equal(load('identity', { crypto: { randomUUID: () => 'native' } }).createUuid(), 'native');

const { clonePlainData } = load('data');
const original = { done: ['first'], pending: { flint: 2 }, optional: undefined, empty: null };
const cloned = clonePlainData(original);
cloned.done.push('second');
cloned.pending.flint = 99;
assert.equal(original.done.length, 1);
assert.equal(original.pending.flint, 2);
assert.ok(Object.hasOwn(cloned, 'optional'));
assert.equal(cloned.empty, null);
assert.equal(clonePlainData(undefined), undefined);

await assert.rejects(load('clipboard', { navigator: {} }).writeClipboardText('report'), /手动复制/);
await assert.rejects(load('clipboard', { navigator: { clipboard: { writeText: async () => { throw new Error('denied'); } } } }).writeClipboardText('report'), /denied/);
let copied = '';
await load('clipboard', { navigator: { clipboard: { writeText: async (text: string) => { copied = text; } } } }).writeClipboardText('report');
assert.equal(copied, 'report');
console.log('Browser compatibility native/fallback checks passed');
