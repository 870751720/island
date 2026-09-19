import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
let now = 0;
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
  vm.runInNewContext(code, {
    module, exports: module.exports, crypto: globalThis.crypto, performance: { now: () => now },
    structuredClone, TextEncoder, URL, process, console,
    setInterval: () => 1, clearInterval: () => {}, setTimeout: () => 1, clearTimeout: () => {},
    localStorage: { getItem: () => null, setItem: () => {} },
    require: (id: string) => id.startsWith('.') ? load(path.resolve(path.dirname(resolved), id))
      : id.startsWith('@/') ? load(`src/${id.slice(2)}`) : require(id),
  });
  return module.exports;
}

const THREE = require('three');
const { Inventory } = load('src/game/systems/Inventory');
const { OwnerWork } = load('src/game/net/OwnerWork');
const { OwnerActionWindow, validOwnerPose } = load('src/game/net/OwnerState');
const { NetHost } = load('src/game/net/NetHost');
const { NetGuest } = load('src/game/net/NetGuest');
const { CollectSystem, harvestPhase } = load('src/game/systems/CollectSystem');
const { FacilitySystem } = load('src/game/systems/FacilitySystem');
const { FishingSystem } = load('src/game/systems/FishingSystem');
const { EatingSystem } = load('src/game/systems/EatingSystem');
const { WaterSystem } = load('src/game/systems/WaterSystem');
const { FOODS } = load('src/game/systems/Food');
const { CrateSystem } = load('src/game/systems/CrateSystem');
const { WorldEntityIds } = load('src/game/systems/WorldEntityId');
const { hasValidNetActionArgs } = load('src/game/net/ActionProtocol');

// Exercise the real Game snapshot application without constructing WebGL.
const gameSource = ts.createSourceFile('Game.ts', fs.readFileSync('src/game/Game.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const gameClass = gameSource.statements.find(ts.isClassDeclaration)!;
const applyPlayers = gameClass.members.find(m => m.name?.getText(gameSource) === 'netApplyPlayers')!;
const snapshotModule = { exports: {} as any };
vm.runInNewContext(ts.transpileModule(`module.exports = class { ${applyPlayers.getText(gameSource)} }`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { module: snapshotModule, THREE, SLOT_ORDER: [] });

function player(tool = 'hand'): any {
  return {
    group: new THREE.Group(), currentTool: tool, currentAction: null, poseEpoch: 0,
    isMoving: false, isSwimming: false, isSleeping: false,
    setAction(action: string | null) { this.currentAction = action; },
    releaseAction(action: string) { if (this.currentAction === action) this.currentAction = null; },
    applyOwnerPose(x: number, y: number, z: number, rot: number, moving: boolean) {
      this.group.position.set(x, y, z); this.group.rotation.y = rot; this.isMoving = moving;
    },
    syncMountPose(pose: number) { this.mountPose = pose; },
    getRodTip: () => false,
  };
}
const audio = { silent: false, play: () => {}, stop: () => {}, eatFinishDuration: .2,
  scheduleEatFinish: () => true, scheduleDrink: () => true };
const fx = { burst: () => {} };
function actor(tool = 'hand'): any {
  return { id: 'guest', player: player(tool), inventory: new Inventory(),
    tools: { shovel: 1, axe: 1, pickaxe: 1, fishingrod: 1 },
    survival: { state: { dead: false, hunger: 0, thirst: 0 } } };
}

const snapshotGame = new snapshotModule.exports();
const owner = actor('axe');
owner.player.group.position.x = 9;
owner.player.setAction('chop');
owner.setName = owner.player.setGender = owner.player.setHealth = owner.player.netSyncWine = () => {};
owner.lastHealth = 100; owner.lastDead = false;
snapshotGame.local = owner; snapshotGame.sessions = [owner]; snapshotGame.lastOwnerEpoch = 0;
snapshotGame.clearOwnerWork = snapshotGame.setJoystick = () => {};
owner.player.respawn = (at: any) => { owner.player.group.position.copy(at); owner.player.setAction(null); };
const oldSnapshot = { id: owner.id, name: '玩家', x: 1, y: 0, z: 0, epoch: 0,
  action: null, tool: 'hand', hunger: 90, thirst: 90, health: 100, stamina: 100, dead: false };
for (let i = 0; i < 20; i++) snapshotGame.netApplyPlayers({ players: { full: [oldSnapshot] } });
assert.equal(owner.player.group.position.x, 9, 'ordinary snapshots cannot rewind local movement');
assert.equal(owner.player.currentAction, 'chop', 'ordinary snapshots cannot cancel local action');
assert.equal(owner.player.currentTool, 'axe');
assert.equal(owner.player.mountPose, 0, 'missing mount pose defaults safely');
snapshotGame.netApplyPlayers({ players: { full: [{ ...oldSnapshot, mountPose: 2 }] } });
assert.equal(owner.player.mountPose, 2, 'host mount pose reaches the local owner');
assert.equal(hasValidNetActionArgs('unequipItem', ['mount']), true);
assert.equal(hasValidNetActionArgs('equipItem', ['skateboard']), true);
snapshotGame.netApplyPlayers({ players: { full: [{ ...oldSnapshot, epoch: 1, x: 20 }] } });
assert.equal(owner.player.group.position.x, 20, 'a forced new epoch does reposition the owner');

// 400ms RTT: input and animation are local; the host settles once after 200ms,
// and the operator learns the result after another 200ms.
const host = new NetHost();
const guest = new NetGuest();
const local = actor();
const authority = actor();
const up: any[] = [];
const down: any[] = [];
let settled = 0;
let available = true;
host.game = {
  runNetAction: (_a: any, fn: () => void) => fn(),
  netWorkFinish: (a: any) => {
    assert.equal(a.player.group.position.x, 4, 'interaction uses the operator position');
    if (!available) return false;
    available = false; settled++; return true;
  },
  hudFor: () => ({ slots: [], health: 100 }),
};
const hostPeer: any = { session: authority, net: { send: (m: any) => down.push(structuredClone(m)) },
  lastPoseSeq: 0, actions: new OwnerActionWindow(), hud: null };
guest.ready = true;
guest.net = { connected: true, send: (m: any) => up.push(structuredClone(m)), close: () => {} };
guest.readPose = () => ({ epoch: 0, x: local.player.group.position.x, y: 0, z: 0, rotY: 0, moving: false, action: 'pick' });
local.player.group.position.x = 4;
local.player.setAction('pick');
let receipt: boolean | undefined;
assert.equal(guest.action('workFinish', ['crops', 'crop_a'], (ok: boolean) => receipt = ok), true);
assert.equal(local.player.currentAction, 'pick');
assert.equal(settled, 0);
now = 200;
host.onMessage(hostPeer, up[0]);
assert.equal(settled, 1);
assert.equal(receipt, undefined);
host.onMessage(hostPeer, up[0]);
assert.equal(settled, 1, 'duplicate reliable command is idempotent');
now = 400;
down.splice(0).forEach(m => guest.onMessage(m));
assert.equal(receipt, true);
assert.equal(local.player.group.position.x, 4, 'confirmation cannot drag the owner');

// An unreliable pose can overtake a reliable action. Settle at the action
// position, then restore the newer pose rather than rejecting the action.
available = true;
host.onMessage(hostPeer, { t: 'ownerPose', pose: { seq: 20, epoch: 0, x: 8, y: 0, z: 0, rotY: 0, moving: true, action: null }, viewWidth: 20, viewHeight: 30 });
const historical = { ...up[0], seq: 2, pose: { ...up[0].pose, seq: 19 } };
host.onMessage(hostPeer, historical);
assert.equal(settled, 2);
assert.equal(authority.player.group.position.x, 8);
authority.player.poseEpoch = 1;
host.onMessage(hostPeer, { ...historical, seq: 3 });
assert.equal(settled, 2, 'pre-respawn actions cannot settle after respawn');
assert.equal(down.at(-1).accepted, false);
assert.equal(validOwnerPose({ ...historical.pose, x: NaN }), false);
assert.equal(validOwnerPose({ ...historical.pose, action: 'invented' }), false);
guest.net.connected = false;
assert.equal(guest.action('workFinish', ['crops', 'crop_a']), false);

// Local harvesting executes feedback, but only the host can change the prop
// and grant inventory. Pending completion does not collect the same prop twice.
function collection() {
  const a = actor();
  const prop = { id: 'prop_a', kind: 'gravel', ready: true, position: new THREE.Vector3(), group: new THREE.Group() };
  const props = { list: [prop], shake: () => {}, harvest: (p: any) => { p.ready = false; } };
  const system = new CollectSystem(a.player, props, a.inventory, a.tools, (k: string, n: number) => a.inventory.add(k, n), fx, audio);
  return { a, prop, system };
}
const collector = collection();
const source = collection();
let hit: any;
collector.system.submitHit = (id: string, phase: string, done: (ok: boolean) => void) => { hit = { id, phase, done }; return true; };
collector.system.update(.1);
assert.equal(collector.a.player.currentAction, 'pick');
collector.system.update(.5);
assert.ok(hit);
assert.equal(collector.prop.ready, true);
assert.equal(collector.a.inventory.count('stone'), 0);
assert.equal(source.system.settleHit(hit.id, hit.phase), true);
assert.ok(source.a.inventory.count('stone') > 0);
assert.equal(source.system.settleHit(hit.id, hit.phase), false);
collector.system.update(.6);
assert.equal(collector.a.inventory.count('stone'), 0);
collector.prop.ready = false;
hit.done(true);
assert.notEqual(harvestPhase(collector.prop), hit.phase);

// Local facility recovery leaves its mirror intact; the host owns removal.
function facility(a: any) {
  const sys = new FacilitySystem({ scene: new THREE.Scene(), fx,
    give: (k: string, n: number) => a.inventory.add(k, n) }, { color: () => '#fff' }, 'shrine');
  const target = { kind: 'torch', group: new THREE.Group(), dispose: () => {} };
  sys.facilities.push(target); sys.ids.set(target, 'torch_a');
  return sys;
}
const digger = actor('shovel');
let request: any;
digger.ownerWork = new OwnerWork((system: string, id: string, done: (ok: boolean) => void) => { request = { system, id, done }; return true; });
const mirror = facility(digger);
mirror.updateActor(digger, .6); mirror.updateActor(digger, .6); mirror.updateActor(digger, .6);
assert.equal(request.id, 'torch_a');
assert.equal(mirror.facilities.length, 1);
assert.equal(digger.inventory.count('torch'), 0);
const hostDigger = actor('shovel');
const realFacility = facility(hostDigger);
assert.equal(realFacility.settleDig(hostDigger, request.id), true);
assert.equal(realFacility.settleDig(hostDigger, request.id), false);
assert.equal(hostDigger.inventory.count('torch'), 1);

// A vanished selected box must not silently redirect a take to its neighbor.
const crates = Object.create(CrateSystem.prototype);
crates.scratch = new THREE.Vector3(); crates.ids = new WorldEntityIds('crate');
const box = { group: new THREE.Group() }; crates.ids.set(box, 'other_box'); crates.crates = [box];
const visitor = actor(); visitor.interactionTarget = 'removed_box';
assert.equal(crates.nearby(visitor), null);
visitor.interactionTarget = undefined;
assert.equal(crates.nearby(visitor), box);

// Local food and water clocks never apply authoritative inventory/vital gains.
const eater = actor(); eater.inventory.add('berry', 1);
let portions = 0;
const survival = { state: { hunger: 0, thirst: 0 }, eat: () => portions++, drink: () => portions++ };
const eating = new EatingSystem(eater.player, eater.inventory, survival, fx, audio);
let foodRequest = false;
eating.submitPortion = () => { foodRequest = true; return true; };
assert.equal(eating.start(FOODS.find((f: any) => f.kind === 'berry')), true);
eating.update(2);
assert.equal(foodRequest, true);
assert.equal(eater.inventory.count('berry'), 1);
assert.equal(portions, 0);
const drinking = new WaterSystem(eater.player, { getWaterKind: () => 'pond', getWaterLevel: () => 0, getHeight: () => 0 }, survival, audio);
let waterRequest = false; drinking.submitRound = () => { waterRequest = true; return true; };
drinking.update(2, false);
assert.equal(waterRequest, true); assert.equal(portions, 0);

// The operator owns the fishing reaction window. The host ticket owns the loot,
// so a late catch settles exactly once without letting the guest invent a fish.
function fishing() {
  const a = actor('fishingrod');
  let caught = 0;
  const system = new FishingSystem(new THREE.Scene(), a.player,
    { getWaterKind: (_x: number, z: number) => z > .5 ? 'sea' : null, getWaterLevel: () => 0 },
    a.inventory, { count: () => 0, remove: () => true }, { splash: () => {}, ripple: () => {} }, fx, audio, a.tools,
    () => ++caught, () => {});
  return { system, count: () => caught };
}
const fisher = fishing(); const fishHost = fishing();
const cast = fisher.system.beginOwnedCast();
const plan = fishHost.system.prepareOwnedCast(cast, false, false);
assert.ok(plan);
fisher.system.applyPlan(plan);
fishHost.system.update(.7, false);
fishHost.system.update(plan.wait + 10, false);
fishHost.system.update(60, false);
assert.equal(fishHost.system.currentState, 'bite', 'host does not expire the operator reaction window');
let caughtRequest = 0;
fisher.system.submitCatch = (id: number) => { caughtRequest = id; return true; };
fisher.system.update(.7, false); fisher.system.update(plan.wait + .01, false);
while (fisher.system.currentState === 'bite') fisher.system.hook();
if (fisher.system.currentState === 'treasure') fisher.system.claimTreasure();
assert.equal(caughtRequest, cast);
assert.equal(fisher.count(), 0);
fishHost.system.player.isMoving = true;
fishHost.system.update(.1, false);
assert.equal(fishHost.system.currentState, null, 'newer movement may arrive before the reliable catch');
assert.equal(fishHost.system.settleOwnedCatch(cast), true);
assert.equal(fishHost.system.settleOwnedCatch(cast), false);
assert.equal(fishHost.count(), 1);
fisher.system.netStop();
fisher.system.applyPlan(plan);
assert.equal(fisher.system.currentState, null, 'late plan cannot restart a cancelled cast');

assert.equal(hasValidNetActionArgs('place', ['soil', 1, 2]), true);
assert.equal(hasValidNetActionArgs('place', ['soil', Infinity, 2]), false);
assert.equal(hasValidNetActionArgs('workFinish', ['x'.repeat(101), 'id']), false);
console.log('Owner networking: delay, duplicate, reordering, respawn, conflicts, local clocks and fishing passed.');
