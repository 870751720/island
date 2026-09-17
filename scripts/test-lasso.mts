import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';

const modules: Record<string, unknown> = { three: THREE };
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
    bornAt: null, readyAt: 0, hasMilk: false, milkLeft: 10, attackLeft: 0, hitFleeLeft: 0, lungeLeft: 0, rageLeft: 0, roarLeft: 0,
    idleTime: 0, leashEscape: undefined as { elapsed: number; attempts: number } | undefined, walkTime: 0, stamina: 10, roared: true, pounce: null };
}
function harness(a: ReturnType<typeof animal>) {
  return Object.assign(Object.create(Wildlife.prototype), { animals: [a], mercyCooldown: 0, dogThreats: [],
    creatureFx: { update() {} }, lifecycle: { now: 1, cancel() {}, update() {} }, population: { slots: [], update() {} },
    players: () => [player], isPlayerVulnerable: () => true, animate() {}, onAttack() {}, hitPlayer() {},
    nearestPlayer: () => player, terrain: { getHeight: () => 0 }, onLassoEscape() {},
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
    assert.equal(a.milkLeft, species === 'sheep' ? 9 : 10, '只有绵羊产奶');
  }
}
console.log('Lasso rules, hostile attacks, staking, save restoration and milk checks passed.');
