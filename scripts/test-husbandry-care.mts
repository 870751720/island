import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import type { Props } from '../src/game/world/Props';
import type { TameSpecies } from '../src/game/systems/AnimalHusbandry';

const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  (module as NodeJS.Module & { _compile(code: string, filename: string): void })._compile(code, filename);
};
const { Vector3, Group } = require('three') as typeof import('three');
const { AnimalForaging } = require('../src/game/systems/AnimalForaging.ts') as typeof import('../src/game/systems/AnimalForaging');
const { foodPath, clearFoodPath } = require('../src/game/systems/AnimalFoodPath.ts') as typeof import('../src/game/systems/AnimalFoodPath');
const { newHusbandry, feedAnimal, advanceHusbandry, mayEatStoredFood, HEART_MAX, HEART_DURATION } = require('../src/game/systems/AnimalHusbandry.ts') as typeof import('../src/game/systems/AnimalHusbandry');
const { animalFoodHeart } = require('../src/game/systems/AnimalFood.ts') as typeof import('../src/game/systems/AnimalFood');
const { FOODS } = require('../src/game/systems/Food.ts') as typeof import('../src/game/systems/Food');

assert.equal(animalFoodHeart('berry', 'sheep', true), 18);
assert.equal(animalFoodHeart('oakFruit', 'sheep', true), 6);
assert.equal(animalFoodHeart('carrot', 'sheep', true), 30);
assert.equal(animalFoodHeart('tomato', 'sheep', true), 26, '小数向上取整');
assert.equal(animalFoodHeart('cookedPumpkin', 'sheep', true), 48);
assert.equal(animalFoodHeart('gameMeat', 'wolf', true), 30);
assert.equal(animalFoodHeart('cookedGameMeat', 'wolf', true), 72);
assert.equal(animalFoodHeart('berry', 'wolf', true), 0, '不扩大食谱');
for (const food of FOODS) for (const eater of food.eaters) {
  assert.equal(animalFoodHeart(food.kind, eater), food.hunger, '首次驯养和伙伴的基础恢复不变');
  if (eater === 'dog' || eater === 'cat') assert.equal(animalFoodHeart(food.kind, eater, true), food.hunger);
  else assert.ok(animalFoodHeart(food.kind, eater, true) >= food.hunger);
}

function plants(count: number, kind = 'grass') {
  const list = Array.from({ length: count }, (_, i) => {
    const group = new Group(); group.position.set(count === 1 ? -28 : -28 + i * 56 / (count - 1), 0, 0);
    return { kind, group, ready: true, regrowLeft: 0 };
  });
  let grazes = 0;
  const props = { list, harvest(prop: typeof list[number]) { prop.ready = false; prop.regrowLeft = 180; grazes++; } } as unknown as Props;
  return { props, list, grazes: () => grazes };
}

// 活动区两端相距 56 米；连跑六小时，验证可持续供给而非只测一次恢复量。
for (const [species, count] of [['rabbit', 1], ['sheep', 2], ['bison', 3]] as const) {
  const state = newHusbandry(); feedAnimal(state, species, HEART_MAX[species], true);
  const farm = plants(count), origin = new Vector3(28, 0, 0), foraging = new AnimalForaging();
  let stored = 0, lowest = 1;
  const source = { foodTargets: () => [{ position: origin.clone(), consume: () => { stored++; return 18; } }] };
  for (let second = 0; second < 6 * 3600; second++) {
    for (const prop of farm.list) if (!prop.ready) { prop.regrowLeft--; prop.ready = prop.regrowLeft <= 0; }
    advanceHusbandry(state, species, true, 1);
    assert.equal(state.tamed, true, `${species} 六小时仍保持驯养`);
    lowest = Math.min(lowest, state.heart / HEART_MAX[species]);
    if (state.cooldown > 0 || state.eating > 0 || !state.seeking) continue;
    foraging.update(1, origin, species, true, [source], farm.props,
      (x, z) => Math.hypot(x, z) <= 30,
      target => { const distance = origin.distanceTo(target); origin.lerp(target, Math.min(1, 2 / distance)); return true; },
      value => feedAnimal(state, species, value, true), mayEatStoredFood(state, species));
  }
  assert.ok(farm.grazes() > 20);
  assert.equal(stored, 0, `${species} 配置 ${count} 个草丛不消耗储粮`);
  assert.ok(lowest > 0.5);
  console.log(`${species}: six hours, ${farm.grazes()} grazes, no stored food, minimum heart ${(lowest * 100).toFixed(1)}%.`);
}

for (const species of ['wolf', 'bear'] as const) {
  const state = newHusbandry(); feedAnimal(state, species, HEART_MAX[species]);
  assert.equal(HEART_DURATION[species], 3600);
  advanceHusbandry(state, species, true, 1800);
  assert.equal(mayEatStoredFood(state, species), false, '满心后半小时内不用储粮');
  advanceHusbandry(state, species, true, 1);
  assert.equal(mayEatStoredFood(state, species), true);
  feedAnimal(state, species, animalFoodHeart('cookedGameMeat', species, true));
  advanceHusbandry(state, species, true, 20 * 60);
  assert.equal(mayEatStoredFood(state, species), false, '一份烤兽肉至少维持二十分钟');
}

// 自然资源优先于就在脚下的桶；未驯养不得吃自然资源。
for (const tamed of [true, false]) {
  const farm = plants(1), origin = new Vector3(), forage = new AnimalForaging();
  farm.list[0].group.position.set(0.5, 0, 0);
  let stored = 0, received = 0;
  const source = { foodTargets: () => [{ position: origin.clone(), consume: () => { stored++; return 3; } }] };
  forage.update(1, origin, 'sheep', tamed, [source], farm.props, () => true, () => true, value => { received = value; });
  assert.equal(stored, tamed ? 0 : 1);
  assert.equal(received, tamed ? 5 : 3);
}

// 熊吃浆果丛但不吃草；狼不会误吃任何植物。
for (const species of ['bear', 'wolf'] as const) for (const kind of ['grass', 'berry']) {
  const farm = plants(1, kind); farm.list[0].group.position.set(0, 0, 0);
  let received = 0;
  new AnimalForaging().update(1, new Vector3(), species, true, [], farm.props, () => true, () => true, value => { received = value; }, false);
  assert.equal(received, species === 'bear' && kind === 'berry' ? 18 : 0);
}

// 远端目标的绕路不再受 17 米搜索圈限制，仍不能穿越封闭围栏。
const origin = new Vector3(-28, 0, 0), goal = new Vector3(28, 0, 0);
const allowed = (x: number, z: number) => Math.hypot(x, z) <= 30 && !(Math.abs(x) < 0.4 && Math.abs(z) < 2);
const path = foodPath(origin, goal, allowed, 60);
assert.ok(path);
let previous = origin;
for (const next of path) { assert.ok(clearFoodPath(previous, next, allowed)); previous = next; }
assert.equal(previous, goal);
const wall = (x: number, z: number) => Math.hypot(x, z) <= 30 && Math.abs(x) >= 0.4;
assert.equal(foodPath(origin, goal, wall, 60), null);

// 低于 50% 才启用储粮；重新回到阈值之上必须放弃尚未吃到的储粮目标。
const forage = new AnimalForaging(); let consumed = 0;
const source = { foodTargets: () => [{ position: new Vector3(2, 0, 0), consume: () => { consumed++; return 18; } }] };
const waiting = new Vector3();
forage.update(1, waiting, 'sheep', true, [source], null, () => true, () => true, () => {}, true);
waiting.x = 2;
forage.update(1, waiting, 'sheep', true, [source], null, () => true, () => true, () => {}, false);
assert.equal(consumed, 0);
for (const species of Object.keys(HEART_MAX) as TameSpecies[]) {
  assert.equal(mayEatStoredFood({ tamed: true, heart: HEART_MAX[species] / 2 }, species), false);
  assert.equal(mayEatStoredFood({ tamed: true, heart: HEART_MAX[species] / 2 - 0.01 }, species), true);
  assert.equal(mayEatStoredFood({ tamed: false, heart: HEART_MAX[species] - 1 }, species), true);
}
console.log('Care food values, unchanged taming/companions, predator intervals, natural priority, range and fences passed.');
