import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';

const modules: Record<string, any> = { three: THREE, '../systems/GmSystem': { GmSystem: { wolfEscapeChance: 0.95, bearEscapeChance: 0.99, husbandryDecaySpeed: 1, husbandryProductionSpeed: 1 } } };
function load(file: string): any {
  const source = fs.readFileSync(path.resolve('src/game', `${file}.ts`), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const context = vm.createContext({ exports: {}, require: (name: string) => modules[name] ?? {}, console });
  vm.runInContext(code, context, { filename: file });
  return context.exports;
}
const husbandry = load('systems/AnimalHusbandry');
const { newHusbandry, feedAnimal, advanceHusbandry, restoreHusbandry, HEART_MAX, HEART_DURATION, mayEatStoredFood } = husbandry;
modules['../systems/AnimalHusbandry'] = husbandry;
modules['./AnimalHusbandry'] = husbandry;
modules['./HusbandryFood'] = load('systems/HusbandryFood');
modules['./AnimalFoodPath'] = load('systems/AnimalFoodPath');
modules['./ResearchIngredients'] = load('systems/ResearchIngredients');
modules['./HiddenRecipeCatalog'] = load('systems/HiddenRecipeCatalog');
modules['./Food'] = load('systems/Food');
modules['./AnimalFood'] = load('systems/AnimalFood');
modules['./ForagingSearchQueue'] = modules['../systems/ForagingSearchQueue'] = load('systems/ForagingSearchQueue');
const searches = new modules['./ForagingSearchQueue'].ForagingSearchQueue(() => 0);
modules['../systems/AnimalForaging'] = load('systems/AnimalForaging');
modules['./WildlifePursuit'] = load('entities/WildlifePursuit');
modules['./WildlifeMovement'] = load('entities/WildlifeMovement');
modules['./LassoRules'] = load('entities/LassoRules');
modules['./WildlifeLifecycle'] = load('entities/WildlifeLifecycle');
modules['../core/HitSegment'] = load('core/HitSegment');
const { Wildlife } = load('entities/Wildlife');

for (const species of Object.keys(HEART_MAX)) {
  const state = newHusbandry();
  assert.equal(feedAnimal(state, species, HEART_MAX[species] - 1), false);
  assert.equal(feedAnimal(state, species, 1000), false, '冷却期不能重复进食');
  advanceHusbandry(state, species, true, 5);
  assert.equal(feedAnimal(state, species, 1000), true);
  assert.equal(state.heart, HEART_MAX[species]);
  const seekAt = HEART_DURATION[species] * 0.3;
  advanceHusbandry(state, species, true, seekAt - 1);
  assert.equal(state.seeking, false);
  advanceHusbandry(state, species, true, 2);
  assert.equal(state.seeking, true, '低于70%启动寻食');
  advanceHusbandry(state, species, true, HEART_DURATION[species] - seekAt - 1);
  assert.equal(state.tamed, false, '各物种满心耗尽后失去驯养');
  assert.equal(state.heart, 0);
  assert.equal(state.home, null);
  assert.equal(state.milk, false);
}

for (const species of ['sheep', 'bison']) {
  const state = newHusbandry(); feedAnimal(state, species, 1000);
  advanceHusbandry(state, species, false, 600);
  assert.equal(state.milk, false); assert.equal(state.wool, false, '幼崽不生产');
  assert.equal(state.milkLeft, 600);
  advanceHusbandry(state, species, true, 599);
  assert.equal(state.milk, false);
  advanceHusbandry(state, species, true, 1);
  assert.equal(state.milk, true);
  assert.equal(state.wool, species === 'sheep');
  const restored = restoreHusbandry(JSON.parse(JSON.stringify(state)), species);
  assert.equal(restored.milk, true); assert.equal(restored.heart, state.heart);
  advanceHusbandry(restored, species, true, 0);
  assert.equal(restored.heart, state.heart, '暂停不扣爱心');
  const old = restoreHusbandry(undefined, species);
  assert.equal(old.tamed, false); assert.equal(old.milk, false, '旧套索产奶不能保留');
}

const foods = modules['./Food'].FOODS;
for (const food of foods) {
  assert.ok(Array.isArray(food.eaters));
  assert.equal(new Set(food.eaters).size, food.eaters.length);
}
for (const forbidden of ['cola', 'colaZero', 'wineMilk', 'puffer', 'pepper']) assert.equal(foods.find((f: any) => f.kind === forbidden).eaters.length, 0);
assert.ok(modules['./AnimalFood'].animalFood('carrot', 'rabbit'));
assert.equal(modules['./AnimalFood'].animalFood('gameMeat', 'rabbit'), undefined);
assert.ok(modules['./AnimalFood'].animalFood('gameMeat', 'wolf'));
assert.equal(modules['./AnimalFood'].animalFood('gameMeat', 'dog'), undefined);
assert.ok(modules['./AnimalFood'].animalFood('cookedGameMeat', 'dog'));

const player = { group: new THREE.Group() };
function animal(species = 'sheep'): any {
  return { id: 1, species, alive: true, hidden: false, leash: null, netLeash: null, pos: new THREE.Vector3(), target: new THREE.Vector3(),
    config: { damage: species === 'wolf' ? 10 : 0, attackRange: 2, attackCooldown: 1, senseRange: 10, deaggroRange: 15, hp: 100, walkSpeed: 1 }, hp: 100,
    bornAt: null, readyAt: 0, husbandry: newHusbandry(), foraging: new modules['../systems/AnimalForaging'].AnimalForaging(searches),
    attackLeft: 0, hitFleeLeft: 0, lungeLeft: 0, rageLeft: 0, roarLeft: 0, calfAttacker: null, boundTo: null,
    idleTime: 0, walkTime: 0, stamina: 10, roared: true, pounce: null, heading: 0,
    model: { group: new THREE.Group() }, netPos: new THREE.Vector3(), netHeading: 0 };
}
function harness(a: any): any {
  return Object.assign(Object.create(Wildlife.prototype), { animals: [a], foragingSearches: searches, mercyCooldown: 0, dogThreats: [],
    movement: new modules['./WildlifeMovement'].WildlifeMovement(),
    creatureFx: { update() {} }, lifecycle: { now: 1, cancel() {}, update() {}, reset() {} }, population: { slots: [], update() {}, release() {} },
    pursuit: new modules['./WildlifePursuit'].WildlifePursuit(), players: () => [player], isPlayerVulnerable: () => true, animate() {}, onAttack() {}, hitPlayer() {},
    nearestPlayer: () => player, terrain: { getHeight: () => 1 }, isGrass: () => true, isBlocked: () => false,
    onLassoEscape() {}, onLassoResult() {}, onAnimalEat() {}, clearLifeScale() {},
  });
}

const a = animal('wolf'), w = harness(a);
feedAnimal(a.husbandry, 'wolf', 1000);
assert.equal(w.damage(1, 100), null);
assert.equal(w.damageNearby(a.pos, 3, 100), null);
assert.equal(w.hitSegment(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 0, 0), 1), null);
assert.equal(w.nearestId(a.pos, 3), null);
let targets: any[] = []; w.collectAimTargets(a.pos, 3, targets); assert.equal(targets.length, 0);
w.collectAimTargets(a.pos, 3, targets, true); assert.equal(targets.length, 1, '驯养动物仍可被套索瞄准');
assert.equal(w.lassoAnimal(1, player), true); assert.equal(a.leashEscape.attempts, 5);
w.releaseLeash(1, { x: 4, z: 5 }); assert.equal(a.husbandry.home.x, 4);
assert.equal(w.canStand(a, 34, 5), true); assert.equal(w.canStand(a, 34.1, 5), false);
const saved = w.snapshotFamilies().animals[0]; assert.equal(saved.husbandry.tamed, true, '未拴桩的狼也要存档');
const home = { ...a.husbandry.home };
w.lassoAnimal(1, player); w.releaseLeash(1); assert.equal(a.husbandry.home.x, home.x, '被动释放不刷新中心');
w.lassoAnimal(1, player); w.releaseLeash(1, { x: 0, z: 0 });
a.husbandry.heart = 0.001;
let attacks = 0; w.hitPlayer = () => attacks++;
w.update(0.1, 0.1, 1);
assert.equal(a.husbandry.tamed, false); assert.equal(attacks, 1, '归零后狼重新攻击');
assert.equal(a.husbandry.home, null);

const restoredWorld = harness(animal('wolf'));
restoredWorld.animals = [];
restoredWorld.createAnimal = (species: string) => { const value = animal(species); restoredWorld.animals.push(value); return value; };
restoredWorld.restoreFamilies({ animals: [saved], slots: [] }, 10);
assert.equal(restoredWorld.animals.length, 1);
assert.equal(restoredWorld.animals[0].husbandry.tamed, true);
assert.equal(restoredWorld.animals[0].husbandry.home.x, 4);
const guestAnimal = animal('wolf'), guest = harness(guestAnimal);
guest.netApply(restoredWorld.netPoses());
assert.equal(guestAnimal.husbandry.tamed, true);
assert.equal(guest.nearestId(guestAnimal.pos, 3), null, '客人也排除驯养目标');
restoredWorld.animals[0].husbandry.tamed = false;
restoredWorld.animals[0].husbandry.heart = 0;
guest.netApply(restoredWorld.netPoses());
assert.equal(guest.nearestId(guestAnimal.pos, 3), 1, '归零快照恢复客人索敌');

const feedingWolf = animal('wolf'), feedingWorld = harness(feedingWolf);
feedingWorld.lassoAnimal(1, player);
feedingWolf.leashEscape.attempts = 5;
let available = 2;
feedingWorld.foodDrops = { foodTargets: () => [{ position: feedingWolf.pos.clone(), consume: () => available > 0 ? (available--, 150) : 0 }] };
feedingWorld.update(0.1, 0.1, 1);
feedingWorld.update(0.1, 0.2, 1);
assert.equal(feedingWolf.husbandry.tamed, true, '真实动物循环可以通过掉落食物驯养');
assert.equal(available, 1);
feedingWorld.update(0.1, 0.2, 1);
assert.equal(available, 1, '同一堆食物不会被连续帧吃光');

const sheep = animal(), sw = harness(sheep);
sw.lassoAnimal(1, player); assert.equal(sw.canTame(sheep), true);
feedAnimal(sheep.husbandry, 'sheep', 5); sw.releaseLeash(1); assert.equal(sheep.husbandry.heart, 0);
feedAnimal(sheep.husbandry = newHusbandry(), 'sheep', 60);
sheep.husbandry.wool = sheep.husbandry.milk = true;
assert.equal(sw.takeProduce(1, new THREE.Vector3(10, 0, 0), true), null, '远处不能剪毛');
assert.equal(sw.takeProduce(1, player.group.position, true).kind, 'wool');
assert.equal(sw.takeProduce(1, player.group.position, true), null, '不能重复领取');
assert.equal(sheep.husbandry.shorn, true); assert.equal(sheep.husbandry.milk, true, '奶和毛独立');
assert.equal(sw.takeProduce(1, player.group.position, false).kind, 'milk');
sheep.husbandry.milk = true; sheep.bornAt = 0;
assert.equal(sw.takeProduce(1, player.group.position, false), null, '幼崽不能领取产物');

const { AnimalForaging } = modules['../systems/AnimalForaging'];
let portions = 3, eaten = 0;
const source = { foodTargets: () => [{ position: new THREE.Vector3(1, 0, 0), consume: () => { if (!portions) return 0; portions--; return 8; } }] };
const foraging = new AnimalForaging(searches), origin = new THREE.Vector3();
for (let i = 0; i < 80 && !eaten; i++) { searches.update(); foraging.update(0.1, origin, 'rabbit', true, [source], null,
  () => true, (target: THREE.Vector3) => { origin.lerp(target, 0.3); return true; }, (hunger: number) => eaten += hunger); }
assert.equal(portions, 2); assert.equal(eaten, 8, '每次只消耗一份');
origin.set(0, 0, 0); foraging.reset(); eaten = 0;
for (let i = 0; i < 15; i++) { searches.update(); foraging.update(0.1, origin, 'rabbit', true, [source], null,
  (x: number) => x < 0.3, () => { throw Error('不能穿过封闭围栏'); }, () => eaten++); }
assert.equal(eaten, 0);

const { DropSystem } = load('systems/DropSystem');
const drop = { kind: 'carrot', count: 2, source: 'discarded', age: 5, mesh: new THREE.Group(), id: 'food' };
const drops = Object.assign(Object.create(DropSystem.prototype), { drops: [drop] });
const d1 = drops.foodTargets('rabbit', origin, 3)[0], d2 = drops.foodTargets('sheep', origin, 3)[0];
assert.equal(d1.consume(), 8); assert.equal(drop.count, 1);
drop.source = 'loot'; assert.equal(drops.foodTargets('rabbit', origin, 3).length, 0);
drop.source = 'discarded'; drops.remove = (index: number) => drops.drops.splice(index, 1);
assert.equal(d2.consume(), 8); assert.equal(d1.consume(), 0, '争食不能重复消费已移除物品');

modules['../systems/Inventory'] = load('systems/Inventory');
const { Inventory } = modules['../systems/Inventory'];
const { CrateSystem } = load('systems/CrateSystem');
const crate = { kind: 'feedBarrel', group: new THREE.Group(), storage: new Inventory(), updateIcon() {} };
crate.storage.setCapacity(20); crate.storage.add('carrot', 2);
const changes: unknown[] = [];
const crates = Object.assign(Object.create(CrateSystem.prototype), { crates: [crate], scratch: new THREE.Vector3(),
  ids: { get: () => 'feed' }, onChanged: (change: unknown) => changes.push(change), audio: { play() {} } });
const actor = { player, inventory: new Inventory() }; actor.inventory.add('wood', 3);
assert.equal(crates.store(actor, 'wood'), 'invalid'); assert.equal(actor.inventory.count('wood'), 3);
const c1 = crates.foodTargets('rabbit', origin, 5)[0], c2 = crates.foodTargets('dog', origin, 5)[0];
assert.equal(c1.consume(), 8); assert.equal(crate.storage.count('carrot'), 1);
assert.equal(c2.consume(), 8); assert.equal(c1.consume(), 0);
assert.equal(changes.length, 2, '食料桶扣除通过容器增量同步');
assert.equal(crates.snapshot()[0].slots.length, 20);

console.log('Husbandry: decay, feeding thresholds, cooldown, production, old saves, combat, leash centers, harvest, food competition and crate deltas passed.');

{
  const state = newHusbandry(); feedAnimal(state, 'sheep', 60);
  advanceHusbandry(state, 'sheep', true, 10, 0, 60);
  assert.equal(state.heart, 60, 'GM 可冻结爱心');
  assert.equal(state.milk, true); assert.equal(state.wool, true);
  assert.equal(state.cooldown, 0, '生产倍率不改变进食冷却');
  advanceHusbandry(state, 'sheep', true, 30, 60, 1);
  assert.equal(state.tamed, false, 'GM 衰减加速仍走失养清理');
}

{
  const state = newHusbandry();
  feedAnimal(state, 'sheep', 60, true);
  assert.equal(state.wool, true, '成年长毛羊驯养成功即可剪毛');
  assert.equal(state.milk, false, '首次驯养不提前产奶');
  state.wool = false; state.shorn = true; state.woolLeft = 600;
  advanceHusbandry(state, 'sheep', true, 599, 0);
  assert.equal(state.wool, false, '剪后必须等满十分钟');
  advanceHusbandry(state, 'sheep', true, 1, 0);
  assert.equal(state.wool, true); assert.equal(state.shorn, false);
  const shorn = newHusbandry(); shorn.shorn = true;
  feedAnimal(shorn, 'sheep', 60, true);
  assert.equal(shorn.wool, false, '短毛羊重新驯养不会立即产毛');
  const calf = newHusbandry(); feedAnimal(calf, 'sheep', 60, false);
  assert.equal(calf.wool, false, '幼羊驯养后不可剪毛');
  advanceHusbandry(calf, 'sheep', true, 0.1, 0);
  assert.equal(calf.wool, true, '成年后可剪现有完整羊毛');
  const old = restoreHusbandry({ tamed: true, heart: 60, shorn: false }, 'sheep');
  advanceHusbandry(old, 'sheep', true, 0.1, 0);
  assert.equal(old.wool, true, '旧档长毛成年驯养羊可直接剪毛');
}
{
  const sheep = animal(), world = harness(sheep);
  world.foodDrops = { foodTargets: () => [] };
  let portions = 2;
  world.foodBarrels = { foodTargets: () => [{ position: new THREE.Vector3(), consume: () => portions > 0 ? (portions--, 60) : 0 }] };
  world.updateHusbandry(sheep, 0.1);
  while (searches.pending) searches.update();
  world.updateHusbandry(sheep, 0.1);
  assert.equal(portions, 2, '未套住的野生动物不能吃桶内食物');
  world.lassoAnimal(1, player);
  world.updateHusbandry(sheep, 0.1);
  while (searches.pending) searches.update();
  world.updateHusbandry(sheep, 0.1);
  assert.equal(portions, 1, '首次驯养可从食料桶取一份');
  assert.equal(sheep.husbandry.tamed, true);
  assert.equal(sheep.husbandry.wool, true);
  const guestSheep = animal(), guestWorld = harness(guestSheep);
  guestWorld.applyLifeScale = () => {};
  guestWorld.netApply(world.netPoses());
  assert.equal(guestSheep.husbandry.wool, true, '立即可剪状态同步到客人');
  assert.equal(world.takeProduce(1, player.group.position, true).kind, 'wool');
  assert.equal(world.takeProduce(1, player.group.position, true), null);
}
console.log('Immediate wool, regrowth, old saves, taming barrel and guest sync passed.');

{
  crate.storage.add('berry', 3);
  const sheep = animal(), world = harness(sheep);
  sheep.husbandry = restoreHusbandry({ tamed: true, heart: 29, seeking: true, home: { x: 0, z: 0 } }, 'sheep');
  world.foodDrops = { foodTargets: () => [] }; world.foodBarrels = crates;
  world.updateHusbandry(sheep, 0.1);
  while (searches.pending) searches.update();
  world.updateHusbandry(sheep, 0.1);
  assert.equal(sheep.husbandry.heart, 47, '真实桶消费采用日常浆果恢复量');
  assert.equal(crate.storage.count('berry'), 2);
  advanceHusbandry(sheep.husbandry, 'sheep', true, 5);
  world.updateHusbandry(sheep, 0.1);
  while (searches.pending) searches.update();
  world.updateHusbandry(sheep, 0.1);
  assert.equal(crate.storage.count('berry'), 2, '恢复到50%以上不继续消耗储粮');
  const guestSheep = animal(), guestWorld = harness(guestSheep);
  guestWorld.applyLifeScale = () => {};
  guestWorld.netApply(world.netPoses());
  assert.ok(Math.abs(guestSheep.husbandry.heart - sheep.husbandry.heart) <= 0.005, '日常喂养后的爱心按原快照两位小数精度回流');
  assert.equal(guestSheep.husbandry.tamed, true);
  assert.equal(world.canStand(sheep, 30, 0), true);
  assert.equal(world.canStand(sheep, 30.01, 0), false);
  world.lassoAnimal(1, player); world.stakeAnimal(1, 0, 0);
  assert.equal(world.canStand(sheep, 3.01, 0), false, '活动范围扩大不绕过桩绳');
  assert.equal(crates.foodTargets('sheep', origin, 5)[0].consume(), 3, '首次驯养仍是3点浆果');
  const first = crates.foodTargets('sheep', origin, 5, true)[0];
  const competing = crates.foodTargets('bear', origin, 5, true)[0];
  assert.equal(first.consume(), 18); assert.equal(competing.consume(), 0, '日常恢复不重复扣除共享库存');
}
{
  const freshDrop = { kind: 'berry', count: 3, source: 'discarded', age: 5, mesh: new THREE.Group(), id: 'care-food' };
  drops.drops = [freshDrop];
  assert.equal(drops.foodTargets('sheep', origin, 5)[0].consume(), 3);
  assert.equal(drops.foodTargets('sheep', origin, 5, true)[0].consume(), 18);
  assert.equal(drops.foodTargets('dog', origin, 5)[0].consume(), 3, '伙伴恢复量不变');
  assert.equal(drops.drops.length, 0);
}
console.log('Care barrel/drop settlement, storage threshold, guest snapshots, rope limit and competition passed.');
