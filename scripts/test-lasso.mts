import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';

const modules: Record<string, any> = { three: THREE, '../systems/GmSystem': { GmSystem: { wolfEscapeChance: 0.95, bearEscapeChance: 0.99, husbandryDecaySpeed: 1, husbandryProductionSpeed: 1 } } };
function load(file: string) {
  const source = fs.readFileSync(new URL(`../src/game/entities/${file}.ts`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const context = vm.createContext({ exports: {}, require: (name: string) => modules[name] ?? {} });
  vm.runInContext(code, context);
  return context.exports;
}
const rules = load('LassoRules');
modules['./LassoRules'] = rules;
modules['./WildlifeLifecycle'] = load('WildlifeLifecycle');
modules['./WildlifePursuit'] = load('WildlifePursuit');
modules['./WildlifeMovement'] = load('WildlifeMovement');
modules['../systems/AnimalHusbandry'] = load('../systems/AnimalHusbandry');
modules['./AnimalHusbandry'] = modules['../systems/AnimalHusbandry'];
modules['./HusbandryFood'] = load('../systems/HusbandryFood');
modules['./AnimalFoodPath'] = load('../systems/AnimalFoodPath');
modules['../systems/AnimalForaging'] = load('../systems/AnimalForaging');
const { Wildlife } = load('Wildlife');
for (const species of ['sheep', 'rabbit', 'bison', 'wolf', 'bear']) assert.ok(rules.canLasso(species));
for (const species of ['deer', 'crocodile']) assert.equal(rules.canLasso(species), false);
for (const [species, interval, cumulative] of [['wolf', 5, 0.95], ['bear', 3, 0.99]] as const) {
  const progress = { elapsed: 0, attempts: 0 };
  let rolls = 0;
  assert.equal(rules.advanceLassoEscape(species, progress, interval - 0.25, () => { rolls++; return 0; }), false);
  assert.equal(rolls, 0);
  assert.equal(rules.advanceLassoEscape(species, progress, 0.25, () => { rolls++; return 0; }), true);
  assert.equal(rolls, 1);
  const failed = { elapsed: 0, attempts: 0 };
  rolls = 0;
  assert.equal(rules.advanceLassoEscape(species, failed, interval * 20, () => { rolls++; return 1; }), false);
  assert.equal(rolls, 5);
  rules.advanceLassoEscape(species, failed, 1000, () => { throw Error('超过五次'); });
  const p = 1 - (1 - cumulative) ** 0.2;
  assert.equal(rules.advanceLassoEscape(species, { elapsed: 0, attempts: 0 }, interval, () => p - 1e-10), true);
  assert.equal(rules.advanceLassoEscape(species, { elapsed: 0, attempts: 0 }, interval, () => p + 1e-10), false);
  assert.ok(Math.abs((1 - (1 - p) ** 5) - cumulative) < 1e-12);
}
const player = { group: new THREE.Group() };
function animal(species: string) {
  return { id: 1, species, alive: true, hidden: false, leash: null, netLeash: null, pos: new THREE.Vector3(), target: new THREE.Vector3(),
    config: { damage: 10, attackRange: 2, attackCooldown: 1, senseRange: 10, deaggroRange: 15, hp: 100 }, hp: 100,
    bornAt: null, readyAt: 0, husbandry: modules['../systems/AnimalHusbandry'].newHusbandry(), foraging: { reset() {}, cancelSearch() {} }, attackLeft: 0, hitFleeLeft: 0, lungeLeft: 0, rageLeft: 0, roarLeft: 0,
    idleTime: 0, leashEscape: undefined as { elapsed: number; attempts: number } | undefined, walkTime: 0, stamina: 10, roared: true, pounce: null };
}
function harness(a: ReturnType<typeof animal>) {
  return Object.assign(Object.create(Wildlife.prototype), { animals: [a], foragingSearches: { update() {} }, mercyCooldown: 0, dogThreats: [],
    pursuit: new modules['./WildlifePursuit'].WildlifePursuit(),
    movement: new modules['./WildlifeMovement'].WildlifeMovement(),
    creatureFx: { update() {} }, lifecycle: { now: 1, cancel() {}, update() {} }, population: { slots: [], update() {} },
    players: () => [player], isPlayerVulnerable: () => true, animate() {}, onAttack() {}, hitPlayer() {},
    nearestPlayer: () => player, isGrass: () => true, isBlocked: () => false, terrain: { getHeight: () => 0 }, onLassoEscape() {}, onLassoResult() {},
  });
}
for (const species of ['sheep', 'rabbit', 'bison', 'wolf', 'bear']) {
  const a = animal(species); const w = harness(a);
  assert.ok(w.lassoAnimal(1, player));
  assert.equal(w.lassoAnimal(1, player), false);
  if (species === 'wolf' || species === 'bear') {
    let hits = 0; w.hitPlayer = () => hits++;
    w.update(0.1, 0.1);
    assert.equal(hits, 1, '受缚猛兽仍能近身攻击');
    const progress = { ...a.leashEscape };
    w.stakeAnimal(1, 0, 0);
    assert.equal(a.leashEscape!.elapsed, progress.elapsed, '打桩不重置计时');
    assert.equal(a.leashEscape!.attempts, progress.attempts, '打桩不重置次数');
    const saved = w.snapshotFamilies().animals[0];
    assert.equal(saved.species, species);
    assert.equal(saved.leashEscape.elapsed, 0.1);
    let restored: any;
    w.createAnimal = (kind: string) => restored = animal(kind);
    w.applyLifeScale = () => {};
    w.lifecycle.reset = () => {};
    w.animals = [];
    w.restoreFamilies({ animals: [saved], slots: [] }, 1);
    assert.equal(restored.species, species);
    assert.equal(restored.leashEscape.elapsed, 0.1);
    assert.ok(restored.leash.anchor);
  } else {
    w.stakeAnimal(1, 0, 0); a.idleTime = 10;
    w.updateLeashed(a, 1);
    assert.equal(a.husbandry.milkLeft, 600, '只套索不能产奶');
    assert.equal(a.husbandry.milk, false);
  }
}
console.log('Lasso rules, hostile attacks, staking, save restoration and milk checks passed.');

// 第五次失败只触发一次哭脸结果；成功优先于“用完次数”。
for (const escaped of [false, true]) {
  const original = rules.advanceLassoEscape;
  rules.advanceLassoEscape = (_species: string, progress: { attempts: number }) => { progress.attempts = 5; return escaped; };
  const a = animal('wolf'); const w = harness(a);
  w.lassoAnimal(1, player);
  a.leashEscape!.attempts = 4;
  w.stakeAnimal(1, 0, 0);
  const results: any[] = [];
  let removed = 0;
  w.onLassoResult = (result: unknown) => results.push(result);
  w.onLassoEscape = () => removed++;
  w.update(0.1, 0.1);
  w.update(0.1, 0.2);
  assert.equal(results.length, 1);
  assert.equal(results[0].escaped, escaped);
  assert.equal(removed, escaped ? 1 : 0);
  assert.equal(a.leash === null, escaped);
  assert.equal(results[0].from.y, 0.5);
  rules.advanceLassoEscape = original;
}
console.log('Lasso final-result events fire once and preserve the correct rope state.');

modules['./RopeBreak'] = load('../fx/RopeBreak');
const { LeashLines } = load('../fx/LeashLines');
const scene = new THREE.Scene();
const lines = new LeashLines(scene);
const entry = { key: '1', from: new THREE.Vector3(0, 1, 0), to: new THREE.Vector3(4, 1, 0) };
lines.sync([entry]);
const group = scene.children[0];
const rope = group.children[0];
lines.breakRope('1', entry.from, entry.to);
assert.equal(rope.visible, false);
assert.equal(group.children.length, 3);
const firstHalf = group.children[1] as THREE.Line;
const secondHalf = group.children[2] as THREE.Line;
const end1 = firstHalf.geometry.getAttribute('position').getX(5);
const end2 = secondHalf.geometry.getAttribute('position').getX(5);
assert.ok(end1 < end2, '断口分离，不能仍画成连续绳');
lines.sync([entry]);
assert.equal(rope.visible, false, '旧快照不能让断绳重新出现');
lines.update(0.2);
assert.ok(firstHalf.geometry.getAttribute('position').getX(5) < end1, '断绳向端点回弹');
lines.update(0.4);
assert.ok((firstHalf.material as THREE.LineBasicMaterial).opacity < 1, '断绳逐渐淡出');
lines.update(0.2);
assert.equal(group.children.length, 1, '临时绳段被清理');
lines.sync([]);
lines.sync([entry]);
assert.equal(rope.visible, true, '解绳快照后可正常重新套中');
lines.dispose();
assert.equal(scene.children.length, 0);
// 事件晚于解绳快照、没有缓存绳时，也能凭权威坐标播放。
const late = new LeashLines(scene);
late.breakRope('2', entry.from, entry.to);
assert.equal(scene.children[0].children.length, 2);
late.dispose();
assert.equal(scene.children.length, 0);
console.log('Rope break separation, recoil, fade, snapshot ordering and cleanup checks passed.');

for (const species of ['wolf', 'bear']) {
  assert.equal(rules.advanceLassoEscape(species, { elapsed: 0, attempts: 0 }, 25, () => 0, 0), false);
  assert.equal(rules.advanceLassoEscape(species, { elapsed: 0, attempts: 0 }, 5, () => 0.999999, 1), true);
}
