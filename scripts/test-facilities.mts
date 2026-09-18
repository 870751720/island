import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const cache = new Map<string, { exports: any }>();
function load(file: string): any {
  let resolved = path.resolve(file);
  if (!path.extname(resolved)) resolved = fs.existsSync(`${resolved}.ts`) ? `${resolved}.ts` : path.join(resolved, 'index.ts');
  if (cache.has(resolved)) return cache.get(resolved)!.exports;
  const module = { exports: {} };
  cache.set(resolved, module);
  const code = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, crypto: globalThis.crypto, performance, structuredClone,
    require: (id: string) => id.startsWith('.') ? load(path.resolve(path.dirname(resolved), id))
      : id.startsWith('@/') ? load(`src/${id.slice(2)}`) : require(id) });
  return module.exports;
}

const THREE = require('three') as typeof import('three');
const { AutoPlaceSystem } = load('src/game/systems/AutoPlace.ts');
const { registerFacilities } = load('src/game/systems/FacilityRegistration.ts');
const { ITEMS, itemCategory } = load('src/game/systems/Items.ts');
const { isBackpackItemUsable } = load('src/ui/backpackItemActions.ts');
const { listPlaceables } = load('src/game/systems/ToolCycle.ts');
const { Inventory } = load('src/game/systems/Inventory.ts');
const { AmbientFacilitySystem, createAmbientFacility } = load('src/game/systems/AmbientFacilitySystem.ts');
const { PlaceOccupancy } = load('src/game/systems/PlaceOccupancy.ts');
const { Facility } = load('src/game/entities/Facility.ts');
const { Torch } = load('src/game/entities/Torch.ts');
const { Shrine } = load('src/game/entities/Shrine.ts');
const { isNearbyFacilityDiggable } = load('src/ui/facilityInteraction.ts');

const terrain = { getHeight: () => 1, isNearWater: () => false };
const placement = new AutoPlaceSystem(new THREE.Scene(), terrain);
const context: any = { autoPlace: placement, terrain, bushCellOk: () => null, placeTree: () => true, placeBush: () => true };
for (const key of ['baitBarrels', 'beds', 'brewBarrels', 'burrows', 'campfire', 'cookingStations', 'crates', 'crops',
  'doghouses', 'fences', 'gravelPaths', 'looms', 'plankPaths', 'shrines', 'smelters', 'soils', 'waterPurifiers', 'workbench']) {
  context[key] = { recoveryInteraction: () => null };
}
context.gravelPaths.kind = 'gravelPath';
context.plankPaths.kind = 'plankPath';
registerFacilities(context);
const kinds = Object.keys(ITEMS).filter(kind => itemCategory(kind) === '设施');
const inventory = new Inventory();
inventory.setCapacity(100);
for (const kind of kinds) {
  assert.ok(placement.supports(kind), `${kind} 已注册安放入口`);
  inventory.add(kind, 1);
}
const placeables = listPlaceables({ inventory }, placement, null);
for (const kind of kinds) assert.ok(isBackpackItemUsable(kind, placeables), `${kind} 可从背包使用`);
assert.ok(!isBackpackItemUsable('stone', placeables));
assert.ok(isBackpackItemUsable('bottle', []));
assert.ok(isBackpackItemUsable('berry', []));
assert.equal(placement.defOf('fenceGate').recovery, context.fences);
assert.equal(placement.defOf('stoneGate').recovery, context.fences);
assert.equal(placement.defOf('waterPurifier').recovery, context.waterPurifiers);
assert.equal(placement.defOf('gravelPath').recovery, context.gravelPaths);
assert.equal(placement.defOf('plankPath').recovery, context.plankPaths);
assert.throws(() => placement.register('torch', placement.defOf('torch')), /重复注册/);
// Every registered source is discoverable without another HUD-specific list.
for (const key of Object.keys(context).filter(key => context[key]?.recoveryInteraction && key !== 'crops')) {
  context[key].recoveryInteraction = () => ({ label: key, progress: 0.5 });
  assert.equal(placement.interactions.current({})?.label, key, `${key} 的回收来源未漏接`);
  context[key].recoveryInteraction = () => null;
}

function actor() {
  const player = { group: new THREE.Group(), currentTool: 'shovel', isSwimming: false, isMoving: false,
    setAction: () => {}, releaseAction: () => {} };
  return { player, tools: { shovel: 1 }, inventory: new Inventory() };
}
let claims = 0, releases = 0;
const lights = { claim: () => { claims++; return { intensity: 1.2 }; }, release: () => { releases++; } };
const scene = new THREE.Scene();
const occupancy = new PlaceOccupancy();
const dependencies = { scene, terrain, props: { occupant: () => null }, occupancy,
  fx: { burst: () => {} }, audio: { play: () => {} }, give: (kind: string, count: number, session: any) => session.inventory.add(kind, count) };
const system = new AmbientFacilitySystem(dependencies, lights);
occupancy.register(system);
const host = actor();
host.inventory.add('torch', 2);
assert.ok(system.place(host, 'torch', new THREE.Vector3(0, 1, 0)));
assert.equal(host.inventory.count('torch'), 1);
assert.equal(claims, 1);
assert.ok(!system.place(host, 'torch', new THREE.Vector3(0, 1, 0)), '重叠放置不消耗道具');
assert.equal(host.inventory.count('torch'), 1);
const snapshot = system.snapshot();
assert.equal(snapshot[0].kind, 'torch');
assert.match(snapshot[0].id, /^shrine_/);
assert.ok(createAmbientFacility(new THREE.Scene(), new THREE.Vector3(), 'torch') instanceof Torch);
assert.ok(createAmbientFacility(new THREE.Scene(), new THREE.Vector3(), 'torch') instanceof Facility);
assert.ok(!(createAmbientFacility(new THREE.Scene(), new THREE.Vector3(), 'torch') instanceof Shrine));
assert.equal(claims, 1, '预览不能占用光源');
system.updateActor(host, 0.3);
assert.equal(system.recoveryInteraction(host).label, '拆火把…');
assert.ok(system.recoveryInteraction(host).progress > 0);
const guestScene = new THREE.Scene();
const guest = new AmbientFacilitySystem({ ...dependencies, scene: guestScene }, lights);
guest.netApply(snapshot);
assert.equal(claims, 2);
guest.netApply(snapshot);
assert.equal(claims, 2, '重复快照不能重复领取光源');
assert.equal(guest.snapshot()[0].id, snapshot[0].id);
for (let i = 0; i < 3; i++) system.updateActor(host, 0.6);
assert.equal(system.snapshot().length, 0);
assert.equal(host.inventory.count('torch'), 2, '房主回收只返还一件');
assert.equal(releases, 1);
guest.netApply(system.snapshot());
assert.equal(releases, 2, '客人删除同步释放光源');
assert.equal(guestScene.children.length, 0);
// Existing saves keep the same collection schema, kind and ID, including id-less old records.
system.restore([{ kind: 'torch', x: 0, y: 1, z: 0 },
  { id: 'shrine_old', kind: 'healCrystal', x: 5, y: 1, z: 0 },
  { id: 'shrine_poseidon', kind: 'poseidonBlessing', x: 9, y: 1, z: 0 }]);
assert.equal(system.snapshot()[1].id, 'shrine_old');
assert.ok(system.blessings.blessed);
assert.ok(system.blessings.inAura('healCrystal', new THREE.Vector3(5, 50, 0)));
assert.ok(!system.blessings.inAura('healCrystal', new THREE.Vector3(40, 1, 0)));
system.update(0.1, 1);
system.clear();
assert.equal(claims, releases);
assert.ok(!system.blessings.blessed);
assert.equal(system.recoveryInteraction(host), null);

// Multi-kind systems must use the authoritative target identity rather than a system-wide label.
function recovery(name: string, fields: Record<string, unknown>, expected: string) {
  const Type = load(`src/game/systems/${name}.ts`)[name];
  const instance = Object.assign(Object.create(Type.prototype), fields, { getDigProgress: () => 0.5 });
  assert.equal(instance.recoveryInteraction(host)?.label, expected);
}
recovery('BedSystem', { states: new Map([[host, { digTarget: { level: 3 } }]]) }, '挖三级床…');
recovery('WorkbenchSystem', { states: new Map([[host, { digTarget: { level: 4 } }]]) }, `挖${ITEMS.workbench4.name}…`);
for (const kind of ['fenceGate', 'stoneGate']) {
  recovery('FenceSystem', { states: new Map([[host, { digTarget: { kind: 'gate', key: 'g' } }]]),
    gates: new Map([['g', { kind }]]) }, `拆${ITEMS[kind].name}…`);
}
for (const kind of ['crate', 'ironCrate', 'fishKeep', 'feedBarrel']) {
  recovery('CrateSystem', { diggingKind: () => kind }, `挖${ITEMS[kind].name}…`);
}
recovery('WaterPurifierSystem', {}, '挖海水净化器…');
recovery('RoadSystem', { kind: 'gravelPath' }, '拆碎石小路…');
recovery('CampfireSystem', {}, '挖熄灭的火堆…');
assert.ok(isNearbyFacilityDiggable({ nearCampfire: true, campfireInfo: { lit: false } }));
assert.ok(!isNearbyFacilityDiggable({ nearCampfire: true, campfireInfo: { lit: true } }));
console.log(`设施回归通过：${kinds.length} 种背包设施、全回收来源、目标名称、火把生命周期、旧档与客人增删同步。`);
