import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  (module as NodeJS.Module & { _compile(code: string, filename: string): void })._compile(code, filename);
};
const { Vector3 } = require('three') as typeof import('three');
const { foodPath, clearFoodPath } = require('../src/game/systems/AnimalFoodPath.ts') as typeof import('../src/game/systems/AnimalFoodPath');

// 圈内动物能看到围栏外远处食物，但整面围栏没有出口。
let checks = 0;
const origin = new Vector3(-28, 0, 0), goal = new Vector3(28, 0, 0);
const wall = (x: number, z: number) => {
  checks++;
  return Math.hypot(x, z) <= 30 && Math.abs(x) >= 0.4;
};
assert.equal(foodPath(origin, goal, wall, 60), null);
console.log(`Unreachable food: ${checks} collision checks`);
assert.ok(checks < 20000, '不可达远处食物不应在每个搜索节点发起长距离碰撞扫描');

// 有出口时仍必须能绕行，返回路径的所有线段都不能穿墙。
const allowed = (x: number, z: number) => Math.hypot(x, z) <= 30 && !(Math.abs(x) < 0.4 && Math.abs(z) < 2);
const path = foodPath(origin, goal, allowed, 60);
assert.ok(path);
let previous = origin;
for (const next of path) {
  assert.ok(clearFoodPath(previous, next, allowed));
  previous = next;
}
assert.equal(previous, goal);
console.log('Reachable food still routes around obstacles.');
