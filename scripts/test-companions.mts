import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { Vector3 } from 'three';
import type { Player } from '../src/game/entities/Player';
import type { ResourceKind } from '../src/game/systems/Inventory';

const require = createRequire(import.meta.url);
const THREE = require('three') as typeof import('three');
require.extensions['.ts'] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  (module as NodeJS.Module & { _compile(code: string, filename: string): void })._compile(code, filename);
};
const { CatForaging } = require('../src/game/companions/CatForaging.ts') as typeof import('../src/game/companions/CatForaging');
const { rollCatFood, companionKind, CAT_STAGES } = require('../src/game/companions/CompanionDefinition.ts') as typeof import('../src/game/companions/CompanionDefinition');
const { DogGrowth } = require('../src/game/systems/DogGrowth.ts') as typeof import('../src/game/systems/DogGrowth');
const { Inventory } = require('../src/game/systems/Inventory.ts') as typeof import('../src/game/systems/Inventory');
const { animalFood } = require('../src/game/systems/AnimalFood.ts') as typeof import('../src/game/systems/AnimalFood');
const fakePlayer = () => ({ group: { position: new Vector3() }, isSwimming: false, isSleeping: false } as unknown as Player);

function fixture(blocked = false, full = false) {
  const position = new Vector3(), player = fakePlayer(), inventory = new Inventory();
  if (full) inventory.load([{ kind: 'wood', count: 1 }], 1);
  const finds: { player: Player; kind: ResourceKind; packed: number; position: Vector3 }[] = [];
  let xp = 0, reject = false;
  const cat = new CatForaging({ position,
    dry: (x, z) => !blocked && Math.abs(x) < 30 && Math.abs(z) < 30,
    height: () => 0,
    move: (target, speed, dt) => {
      const delta = target.clone().sub(position); if (delta.length() <= .01) return false;
      position.add(delta.normalize().multiplyScalar(Math.min(speed * dt, position.distanceTo(target)))); return true;
    },
    reward: (owner, kind, at) => { if (reject) return false; finds.push({ player: owner, kind, packed: inventory.add(kind, 1), position: at }); return true; },
    grow: n => xp += n,
  });
  const tick = (seconds: number, stage = 1, threats: Parameters<typeof cat.update>[4] = [], owner = player) => {
    for (let i = 0; i < seconds * 10; i++) cat.update(.1, owner, true, stage, threats, true);
  };
  return { cat, player, position, inventory, finds, tick, xp: () => xp, reject: () => { reject = true; } };
}

assert.equal(companionKind(undefined), 'dog');
assert.equal(companionKind('invalid'), 'dog');
assert.equal(companionKind('cat'), 'cat');
const growth = new DogGrowth();
growth.restore({ xp: 812, companionSeconds: 17, protectCooldown: 26 });
assert.deepEqual(growth.snapshot(), { xp: 812, companionSeconds: 17, protectCooldown: 26 }, '旧档已有成长保持不变');
for (let stage = 1; stage <= 5; stage++) {
  const rolled = new Set(Array.from({ length: 1000 }, (_, i) => rollCatFood(stage, () => i / 1000)));
  assert.equal(rolled.has('birdMeat'), stage >= 4);
  assert.equal(rolled.has('gameMeat'), stage >= 5);
  assert.equal(rolled.has('potato'), stage >= 3);
  assert.equal(rolled.has('fruitFruit'), stage >= 2);
  assert.ok(rolled.has('berry'));
  const f = fixture(); f.tick(8, stage);
  assert.equal(f.finds.length, 1); assert.equal(f.xp(), 6); assert.equal(f.finds[0].packed, 1);
  assert.ok(f.cat.cooldown > CAT_STAGES[stage - 1].cooldown - 8);
  const save = JSON.parse(JSON.stringify({ forageCooldown: f.cat.cooldown }));
  const resumed = fixture(); resumed.cat.restore(save.forageCooldown); resumed.tick(5, stage);
  assert.equal(resumed.finds.length, 0, '读档不重置发掘冷却');
  f.tick(30, stage); assert.equal(f.finds.length, 1, '冷却中不重复发奖');
}
const full = fixture(false, true); full.tick(8);
assert.equal(full.finds.length, 1); assert.equal(full.finds[0].packed, 0); assert.equal(full.xp(), 6);
assert.ok(full.finds[0].position.distanceTo(full.position) < .3, '满包落点使用猫咪发掘位置');
const blocked = fixture(true); blocked.tick(20); assert.equal(blocked.finds.length, 0);
const rejected = fixture(); rejected.reject(); rejected.tick(10); assert.equal(rejected.xp(), 0); assert.equal(rejected.cat.cooldown, 0);

for (const reason of ['walk-away', 'swim', 'sleep', 'dead', 'owner-change', 'combat'] as const) {
  const f = fixture();
  for (let i = 0; i < 100 && f.cat.activity !== 'dig'; i++) f.tick(.1);
  assert.equal(f.cat.activity, 'dig'); f.tick(1);
  let owner = f.player;
  if (reason === 'walk-away') f.player.group.position.set(20,0,20);
  if (reason === 'swim') Object.assign(f.player, { isSwimming: true });
  if (reason === 'sleep') Object.assign(f.player, { isSleeping: true });
  if (reason === 'owner-change') owner = fakePlayer();
  const danger = [{ id: 1, player: f.player, pos: f.position.clone().add(new Vector3(1,0,0)) }];
  f.cat.update(.1, owner, reason !== 'dead', 1, reason === 'combat' ? danger : [], true);
  assert.equal(f.finds.length, 0, `${reason} 中断不发奖`);
  assert.equal(f.cat.cooldown, 0);
  assert.notEqual(f.cat.activity, 'dig');
}
const flee = fixture(); const threat = { id: 1, player: flee.player, pos: new Vector3(1,0,0) };
flee.tick(4, 5, [threat]); assert.ok(flee.position.distanceTo(threat.pos) > 8); assert.equal(flee.finds.length, 0);
flee.tick(4); assert.equal(flee.cat.activity, 'flee', '危险解除后等待五秒');
flee.tick(2); assert.notEqual(flee.cat.activity, 'flee');
const invalid = fixture(); invalid.cat.restore(Infinity); assert.equal(invalid.cat.cooldown, 0);
assert.ok(animalFood('cookedGameMeat', 'cat')); assert.ok(animalFood('cookedSmallFish', 'cat'));
for (const kind of ['berry', 'fruitFruit', 'birdMeat', 'gameMeat', 'cola', 'wineBerry'] as ResourceKind[]) assert.equal(animalFood(kind, 'cat'), undefined);
const { Companion } = require('../src/game/entities/Companion.ts') as typeof import('../src/game/entities/Companion');
const { disposeOwnedMeshes } = require('../src/game/core/disposeOwnedMeshes.ts') as typeof import('../src/game/core/disposeOwnedMeshes');
const terrain = { getHeight: () => 1, getWaterLevel: () => 0 } as unknown as import('../src/game/world/IslandTerrain').IslandTerrain;
const fx = { burst: () => {} } as unknown as import('../src/game/fx/Particles').Particles;
const water = { splash: () => {}, updateSwimming: () => {} } as unknown as import('../src/game/fx/WaterFx').WaterFx;
const drops = { foodTargets: () => [] } as unknown as import('../src/game/systems/DropSystem').DropSystem;
const scene = new THREE.Scene(), player = fakePlayer(); player.group.position.y = 1;
const cat = new Companion(scene, terrain, player, fx, water, () => false, 'cat');
let bites = 0, rewards = 0;
const wildlife = { dogThreats: [], dogBite: () => { bites++; } };
cat.connectCombat(wildlife as unknown as import('../src/game/entities/Wildlife').Wildlife);
cat.onFind = () => { rewards++; return true; };
const companions = [{ player, health: 100, dead: false }];
for (let i = 0; i < 100; i++) cat.update(.1, i / 10, drops, false, companions);
assert.equal(rewards, 1, '真实伴侣控制器触发一次奖励'); assert.equal(cat.growth.xp, 6);
const saved = cat.snapshot(); assert.equal(saved.kind, 'cat'); assert.ok(saved.forageCooldown! > 0);
const guest = new Companion(scene, terrain, player, fx, water, () => false, 'cat');
guest.restore(saved.x, saved.z, saved); guest.netApply(cat.netPose(), 0);
for (let i = 0; i < 100; i++) guest.netUpdate(.1, i / 10);
assert.equal(guest.growth.xp, 6, '客人仅播放，不累计发掘/同行奖励');
assert.equal(guest.debugState.forageCooldown, Math.ceil(saved.forageCooldown!));
cat.clearCooldowns();
wildlife.dogThreats.push({ id: 1, player, pos: new THREE.Vector3(cat.position.x + 1, 1, cat.position.z) } as never);
for (let i = 0; i < 60; i++) cat.update(.1, i / 10, drops, false, companions);
assert.equal(bites, 0, '猫咪永不调用战斗伤害'); assert.equal(rewards, 1, '战斗不产出');
assert.equal(cat.netPose().state, 'flee');
let meshes = 0; cat.group.traverse(o => { if (o instanceof THREE.Mesh) meshes++; });
assert.ok(meshes >= 7 && meshes <= 11, `可乐模型合并静态网格，当前 ${meshes} 个 drawcall`);
const { makeColaModel } = require('../src/game/companions/ColaModel.ts') as typeof import('../src/game/companions/ColaModel');
const appearance = makeColaModel();
let triangles = 0;
appearance.group.traverse(o => { if (o instanceof THREE.Mesh) triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3; });
assert.ok(triangles < 2000, `可乐保持低面预算，当前 ${triangles} 个三角形`);
for (const action of ['walk', 'sleep', 'swim', 'dig', 'groom', 'sniff', 'stretch', 'shake', 'idle']) {
  appearance.update!(1.25, action);
  const bounds = new THREE.Box3().setFromObject(appearance.group);
  assert.ok([...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite), `${action} 动作坐标有效`);
}
assert.equal(appearance.body.rotation.z, 0, '结束甩水后清除侧向旋转');
assert.equal(appearance.body.scale.y, 1, '结束睡眠后恢复身体高度');
disposeOwnedMeshes(appearance.group);
const dog = new Companion(scene, terrain, player, fx, water);
dog.restore(0, 0, { xp: 812, companionSeconds: 17, protectCooldown: 26 });
assert.equal(dog.kind, 'dog'); assert.equal(dog.growth.config.stage, 4); assert.equal(dog.snapshot().xp, 812);
for (const pet of [cat, guest, dog]) disposeOwnedMeshes(pet.group);
console.log(`宠物兼容、五级食物池/冷却、发掘中断、满包、避战、食谱、真实控制器及客人纯表现检查通过；可乐模型 ${meshes} 个网格。`);
