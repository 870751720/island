import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

// 在 Node 中加载游戏的 TypeScript 模块，不启动浏览器或 WebGL。
const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, filename) => {
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  (module as NodeJS.Module & { _compile(source: string, filename: string): void })._compile(source, filename);
};
const { FirstDropGuarantee } = require('../src/game/systems/FirstDropGuarantee.ts');
const { QuestProgress } = require('../src/game/quests/QuestProgress.ts');
const { QUESTS } = require('../src/game/quests/QuestDefinitions.ts');
const { Inventory } = require('../src/game/systems/Inventory.ts');
const { Equipment } = require('../src/game/systems/Equipment.ts');
const { MumbleSystem } = require('../src/game/systems/MumbleSystem.ts');
const { MUMBLE_LINES } = require('../src/game/dialogue/mumbleLines.ts');
const { CollectSystem } = require('../src/game/systems/CollectSystem.ts');

for (const [kind, limit] of [['flint', 2], ['adventureBook', 3]] as const) {
  let guarantee = new FirstDropGuarantee();
  for (let attempt = 1; attempt <= limit; attempt++) {
    assert.equal(guarantee.settle(kind, false), attempt === limit);
    const saved = guarantee.snapshot();
    guarantee = new FirstDropGuarantee();
    guarantee.restore(saved);
  }
  for (let i = 0; i < 10; i++) assert.equal(guarantee.settle(kind, false), false);
  const natural = new FirstDropGuarantee();
  assert.equal(natural.settle(kind, true), false);
  for (let i = 0; i < 10; i++) assert.equal(natural.settle(kind, false), false);
}
assert.deepEqual(QUESTS.slice(0, 5).map((q: { id: string }) => q.id), ['supplies', 'tools', 'materials', 'drink', 'campfire']);

const session = {
  inventory: new Inventory(), equipment: new Equipment(), tools: { axe: 1, pickaxe: 1, sword: 1 },
  craftedIds: new Set(['furHat', 'furShirt', 'furPants', 'furBackpack']),
  crafting: {}, ammo: { add: () => 0 },
};
const quests = new QuestProgress();
quests.restore();
quests.benchAction(2);
quests.update(session, 1, false, false, 12, false, true);
assert.equal(quests.view.done.includes('campfire'), false, '预设火堆和成熟装备不能代为完成放置');
assert.equal(quests.view.finished, false);
quests.campAction('fuel');
quests.update(session, 1, false, false, 12, false, true);
assert.equal(quests.view.done.includes('campfire'), false, '添柴不能代替放置');
quests.campAction('place');
quests.update(session, 1);
assert.equal(quests.view.done.includes('campfire'), true);
assert.equal(quests.view.personalBenchLevel, 2);
quests.benchAction(3);
quests.benchAction(1);
quests.update(session, 1);
assert.equal(quests.view.personalBenchLevel, 3);

const originalRandom = Math.random;
try {
  Math.random = () => 0.99;
  // 真实采集结算：两次碎石采集（每次产出两块石头）只触发一次保底。
  const inventory = new Inventory();
  const firstDrops = new FirstDropGuarantee();
  const collect = new CollectSystem(
    {}, { shake() {}, harvest() {} }, inventory, {},
    (kind: string, count: number) => inventory.add(kind, count),
    { burst() {} }, {}, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
    undefined, (natural: boolean) => firstDrops.settle('flint', natural),
  );
  const gravel = { kind: 'gravel', position: {} };
  collect.hit(gravel);
  assert.equal(inventory.count('flint'), 0);
  collect.hit(gravel);
  assert.equal(inventory.count('flint'), 1);
  collect.hit(gravel);
  assert.equal(inventory.count('flint'), 1);

  const ctx = {
    dead: false, elapsed: 100, hunger: 100, thirst: 100, health: 100, phase: 'day', day: 1,
    raidSkipped: true, rainIntensity: 0, windIntensity: 0, freeSlots: 10, branch: 10, stone: 10,
    tools: { axe: 3, pickaxe: 3 }, collecting: false, personalBenchLevel: 2,
    workbenchCount: 1, smelterCount: 1, loomCount: 1, cookingCount: 1, bedCount: 1,
    hasCookable: false, bottle: 0, meteorActive: false, nearDrinkPoint: false,
  };
  const lines: { time: number; text: string }[] = [];
  let time = 0;
  const mumbles = new MumbleSystem((id: string, text: string) => {
    assert.equal(id, 'wolfBook'); lines.push({ time, text });
  });
  const advance = (seconds: number) => { for (let i = 0; i < seconds; i++) { time++; mumbles.update(1, ctx); } };
  advance(120);
  assert.equal(lines.length, 0, '失败抽签不能直接发言');
  Math.random = () => 0;
  advance(19000);
  assert.ok(lines.length >= 20);
  assert.equal(new Set(lines.slice(0, 20).map(line => line.text)).size, 20);
  for (let i = 1; i < lines.length; i++) assert.ok(lines[i].time - lines[i - 1].time >= 900);
  const count = lines.length;
  ctx.personalBenchLevel = 3;
  advance(2000);
  assert.equal(lines.length, count, '三级后停止提示');
  ctx.personalBenchLevel = 0;
  advance(2000);
  assert.equal(lines.length, count, '世界设施不能解锁个人提示');
  assert.equal(MUMBLE_LINES.wolfBook.length, 20);
} finally {
  Math.random = originalRandom;
}
console.log('新手任务、采石保底、读档与一次性结算、经验书提示概率/冷却/三级截止检查通过。');
