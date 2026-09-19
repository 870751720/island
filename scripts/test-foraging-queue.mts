import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import type { Props } from '../src/game/world/Props';

const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  (module as NodeJS.Module & { _compile(code: string, filename: string): void })._compile(code, filename);
};
const { Vector3, Group } = require('three') as typeof import('three');
const { AnimalForaging } = require('../src/game/systems/AnimalForaging.ts') as typeof import('../src/game/systems/AnimalForaging');
const { ForagingSearchQueue } = require('../src/game/systems/ForagingSearchQueue.ts') as typeof import('../src/game/systems/ForagingSearchQueue');

const queue = new ForagingSearchQueue(() => 0);
const seen = Array<number>(12).fill(0);
const props = { list: Array.from({ length: 80 }, (_, i) => {
  const group = new Group(); group.position.set(7, 0, i / 20 - 2);
  return { kind: 'grass', ready: true, group };
}), harvest() { throw Error('不能隔墙吃食物'); } } as unknown as Props;
const animals = seen.map(() => new AnimalForaging(queue));
animals.forEach((animal, i) => animal.update(0.1, new Vector3(-7, 0, 0), 'sheep', true, [], props,
  (x, z) => { seen[i]++; return Math.hypot(x, z) <= 30 && Math.abs(x) >= 0.4; },
  () => { throw Error('不可达食物不能触发移动'); }, () => { throw Error('不可达食物不能被吃'); }));
let frames = 0, maxChecks = 0;
while (queue.pending) {
  const before = seen.reduce((a, b) => a + b, 0);
  queue.update();
  const count = seen.reduce((a, b) => a + b, 0) - before;
  maxChecks = Math.max(maxChecks, count);
  assert.ok(count <= 2048, `全世界单帧碰撞采样不得随动物数叠加: ${count}`);
  if (++frames === 10) assert.ok(seen.every(n => n > 0), '所有动物公平取得推进机会');
  assert.ok(frames < 10000, '搜索最终能够结束');
}
assert.ok(frames > 1);
console.log(`12 animals / 80 unreachable plants: ${frames} sliced frames, maximum ${maxChecks} collision samples/frame.`);

// 用可控成本验证时间预算，不依赖测试机器快慢。
let time = 0, work = 0;
const timed = new ForagingSearchQueue(() => time);
timed.add((function* () { for (let i = 0; i < 1000; i++) { time += 0.25; work++; yield; } })());
timed.update();
assert.equal(work, 8);
assert.equal(timed.pending, 1);

// 取消任务即时释放，不能在稍后回填旧目标。
const cancelled = new AnimalForaging(queue);
cancelled.update(0.1, new Vector3(), 'sheep', true, [], props, () => true, () => true, () => {});
assert.equal(queue.pending, 1);
cancelled.reset();
assert.equal(queue.pending, 0);

// 远处直达目标的正常行走只检测下一小段；门关闭时仍停止移动。
let blocked = false, checks = 0, moves = 0;
const walk = new AnimalForaging(queue);
const origin = new Vector3(-7, 0, 0);
const allowed = (x: number) => { checks++; return !(blocked && x > -6.9 && x < -6.3); };
const move = () => { moves++; return true; };
walk.update(0.1, origin, 'sheep', true, [], props, allowed, move, () => {});
while (queue.pending) queue.update();
checks = 0;
walk.update(0.1, origin, 'sheep', true, [], props, allowed, move, () => {});
assert.equal(moves, 1);
assert.ok(checks < 10, '每帧不能重复扫描十四米的目标全线');
blocked = true;
walk.update(0.1, origin, 'sheep', true, [], props, allowed, move, () => {});
assert.equal(moves, 1, '门关闭后不继续走旧路线');

// 目标在任务执行期间被其他动物吃掉，完成后也不能重复领取。
let consumed = 0, foodLeft = 1;
const source = { foodTargets: () => [{ position: new Vector3(), consume: () => foodLeft > 0 ? (--foodLeft, 5) : 0 }] };
const eater = new AnimalForaging(queue);
eater.update(0.1, new Vector3(), 'sheep', false, [source], null, () => true, () => true, n => consumed += n);
while (queue.pending) queue.update();
foodLeft = 0;
eater.update(0.1, new Vector3(), 'sheep', false, [source], null, () => true, () => true, n => consumed += n);
assert.equal(consumed, 0);
console.log('Time budget, fairness, cancellation, short movement checks and stale food protection passed.');

// 食物半径按水平距离，15米包含边界；自然资源与储粮都不能选中范围外目标。
for (const distance of [14.99, 15, 15.01, 17, 30, 60]) {
  for (const natural of [false, true]) for (const tamed of [false, true]) {
    const forage = new AnimalForaging(queue);
    const group = new Group(); group.position.set(distance, 0, 0);
    let moved = false;
    const food = { foodTargets: (_species: string, _origin: unknown, radius: number) => {
      assert.equal(radius, 15);
      return [{ position: group.position, consume: () => 5 }];
    } };
    const plants = { list: [{ kind: 'grass', ready: true, group }], harvest() {} } as unknown as Props;
    const sources = natural ? [] : [food];
    forage.update(0.1, new Vector3(), 'sheep', tamed, sources, natural ? plants : null,
      () => true, () => { moved = true; return true; }, () => {});
    while (queue.pending) queue.update();
    forage.update(0.1, new Vector3(), 'sheep', tamed, sources, natural ? plants : null,
      () => true, () => { moved = true; return true; }, () => {});
    assert.equal(moved, distance <= 15 && (!natural || tamed), `${distance}m natural=${natural} tamed=${tamed}`);
    forage.reset();
  }
}
console.log('15m search boundary passed for natural food, stored food and first taming.');
