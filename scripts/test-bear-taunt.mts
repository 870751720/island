import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';
import type { WildlifeRetreat } from '../src/game/entities/WildlifeRetreat';

// 执行正式方法；只替换渲染、场景构建和外部依赖，不启动浏览器或 dev 服务。
const gm = { godMode: false, allowDeath: true };
let random = 0;
const math = Object.create(Math);
math.random = () => random;
const modules: Record<string, unknown> = { three: THREE, './systems/GmSystem': { GmSystem: gm } };
function load(file: string) {
  const source = fs.readFileSync(new URL(`../src/game/${file}.ts`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const context = vm.createContext({ exports: {}, Math: math, require: (name: string) => modules[name] ?? {} });
  vm.runInContext(code, context);
  return context.exports;
}
const rules = load('entities/BearTaunt');
modules['./BearTaunt'] = rules;
const paths = load('entities/WildlifeRetreat');
modules['./WildlifeRetreat'] = paths;
const { Wildlife } = load('entities/Wildlife');
const { Game } = load('Game');
const { TAUNT_ICONS } = load('social/TauntIcons');

assert.equal(rules.canBearSpare(true, 80, 100, 0), false);
assert.equal(rules.canBearSpare(true, 80.01, 100, 0), true);
assert.equal(rules.canBearSpare(false, 100, 100, 0), false);
assert.equal(rules.canBearSpare(true, 100, 100, 0.01), false);
assert.equal(rules.rollBearMercy(() => 0.59999), true);
assert.equal(rules.rollBearMercy(() => 0.6), false);
for (let previous = 0; previous < 6; previous++) {
  for (const roll of [0, 0.2, 0.5, 0.99999]) assert.notEqual(rules.chooseTaunt(previous, () => roll), previous);
}
for (const script of rules.BEAR_TAUNT_SCRIPTS) {
  assert.equal(script.length, 4);
  for (const group of script) {
    assert.ok(group.length >= 2 && group.length <= 3);
    for (const glyph of group) assert.ok(TAUNT_ICONS[glyph]?.includes('<'));
  }
}

function makeAnimal(species = 'bear', x = 1, z = 0) {
  return {
    taunt: undefined as unknown, mock: undefined as unknown, retreat: undefined as WildlifeRetreat | undefined,
    species, alive: true, hidden: false, hp: 100,
    config: { hp: 100, rushSpeed: 5 }, pos: new THREE.Vector3(x, 0, z),
    target: new THREE.Vector3(), model: { group: new THREE.Group() }, heading: 0,
    pounce: { phase: 'leap' }, entrance: null, lungeLeft: 0.35,
  };
}
function harness() {
  const bear = makeAnimal();
  const wolf = makeAnimal('wolf', 10);
  const distant = makeAnimal('wolf', 10.01);
  const hidden = { ...makeAnimal('rabbit', 2), hidden: true };
  const leashed = { ...makeAnimal('sheep', 2), leash: {} };
  const player = { group: new THREE.Group(), applySlow(): void { throw new Error('放生不应施加扑击减速'); } };
  const bubbles: string[][] = [];
  const wildlife = Object.assign(Object.create(Wildlife.prototype), {
    animals: [bear, wolf, distant, hidden, leashed], soloDeathProtection: true,
    mercyCooldown: 0, lastTaunt: -1, dogThreats: [], players: () => [player],
    onTauntExpression: (_target: unknown, glyphs: string[]) => bubbles.push(glyphs),
    onTauntAudience() {}, animate() {}, canStand: () => true,
    terrain: { getHeight: () => 0 },
  });
  const state = { health: 20, dead: false };
  const session = {
    player, markCombat() {}, equipment: { totalReduce: () => 0, totalDefense: () => 0 },
    survival: { state, sleeping: false, damage: (n: number) => { state.health = Math.max(0, state.health - n); } },
  };
  const game = Object.assign(Object.create(Game.prototype), {
    hostRef: null, guestNet: null, local: session, metaLevel: () => 0, playWildlifeHitFeedback() {},
  });
  const hit = () => game.applyWildlifeHit(session, 100, true, () => wildlife.tryBearTaunt(bear, player));
  return { bear, wolf, distant, hidden, leashed, player, wildlife, state, session, game, hit, bubbles };
}

const h = harness();
h.hit();
assert.equal(h.state.health, 1);
assert.ok(h.bear.taunt);
assert.equal(h.bear.pounce, null);
assert.equal(h.bear.lungeLeft, 0);
assert.ok(h.wolf.retreat);
assert.equal(h.distant.retreat, undefined);
assert.equal(h.hidden.retreat, undefined);
assert.equal(h.leashed.retreat, undefined);
assert.equal(h.wildlife.applyDamage(h.bear, 999), null);
assert.equal(h.bear.hp, 100);
h.session.survival.damage(2);
assert.equal(h.state.health, 0, '玩家并无持续无敌');

for (let i = 0; i < 49; i++) h.wildlife.updateTaunt(h.bear, 0.1, i / 10);
assert.equal(h.bubbles.length, 4);
assert.ok(h.bear.taunt);
h.wildlife.updateTaunt(h.bear, 0.2, 5.1);
assert.equal(h.bubbles.length, 5);
assert.equal(h.wildlife.applyDamage(h.bear, 999), null, '撤离同样无敌');
const destination = { ...h.bear.retreat!.destination! };
assert.ok(Math.hypot(destination.x, destination.z) > 30);
h.player.group.position.set(destination.x, 0, destination.z);
h.wildlife.updateTaunt(h.bear, 0.01, 5.2);
assert.equal(h.bear.retreat!.destination!.x, destination.x, '玩家跟随不改变撤离目标');
assert.equal(h.bear.retreat!.destination!.z, destination.z);
assert.ok(h.bear.taunt, '途中继续无敌');
h.bear.pos.set(destination.x, 0, destination.z);
h.wildlife.updateTaunt(h.bear, 0, 5.4);
assert.equal(h.bear.taunt, undefined);
assert.equal(h.bear.retreat!.arrived, true);

const host = harness();
host.game.hostRef = { broadcastEvent() {} };
host.session.player.applySlow = () => {};
host.hit();
assert.equal(host.state.health, 0);
assert.equal(host.bear.taunt, undefined);
const nonlethal = harness();
nonlethal.session.equipment.totalDefense = () => 90;
nonlethal.session.player.applySlow = () => {};
nonlethal.hit();
assert.equal(nonlethal.state.health, 10);
assert.equal(nonlethal.bear.taunt, undefined);
const failed = harness();
failed.session.player.applySlow = () => {};
random = 0.6;
failed.hit();
assert.equal(failed.state.health, 0);
assert.equal(failed.bear.taunt, undefined);
random = 0;
const fractional = harness();
fractional.state.health = 0.4;
fractional.hit();
assert.equal(fractional.state.health, 1);
fractional.wildlife.setSoloDeathProtection(false);
assert.equal(fractional.bear.taunt, undefined);
assert.equal(fractional.wolf.retreat, undefined);
assert.equal(fractional.wolf.mock, undefined);
assert.equal(fractional.wildlife.tryBearTaunt(fractional.bear, fractional.player), false);

const path = paths.findRetreatPath({ x: 0, z: 0 }, { x: 0, z: 0 }, (x: number, z: number) => !(x === 1 && Math.abs(z) < 2), 3);
assert.ok(path.length > 0);
assert.ok(Math.hypot(path.at(-1).x, path.at(-1).z) >= 4);
const blocked = paths.findRetreatPath({ x: 0, z: 0 }, { x: 0, z: 0 }, (x: number, z: number) => Math.abs(x) <= 1 && Math.abs(z) <= 1, 30, true);
assert.ok(blocked.length > 0, '被围住时仍先走到可达的更远处');
const fixedPath = paths.findRetreatPath({ x: 0.3, z: 0.2 }, { x: 0, z: 0 }, () => true, 30, false, { x: 31, z: 0 });
assert.equal(fixedPath.at(-1).x, 31, '半格处重新寻路仍抵达固定终点');
assert.equal(fixedPath.at(-1).z, 0);
const alreadyFar = paths.findRetreatPath({ x: 40, z: 0 }, { x: 0, z: 0 }, () => true);
assert.equal(alreadyFar.length, 1, '演出期间玩家跑远时可选择熊的当前位置');
console.log('Bear taunt checks passed: lethal damage, solo boundary, probability, audience, timeline, invulnerability and retreat.');
