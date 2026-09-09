import type { Game } from '../Game';
import type { PlayerSession } from '../mp/PlayerSession';
import type { ArrowHit } from '../systems/BowSystem';
import type { NetActionArgs, NetActionName } from './ActionProtocol';

/** 客人动作 → Game 方法的参数化分发(以该客人的会话为 actor,由房主权威结算) */
type NetAction<Name extends NetActionName> = (
  game: Game,
  actor: PlayerSession,
  args: NetActionArgs[Name],
) => boolean;

type NetActionRegistry = { [Name in NetActionName]: NetAction<Name> };

const ACTIONS: NetActionRegistry = {
  tool: (g, a, [tool, placeKind]) => {
    // 走 Game 的统一入口:切走套索时先松开正牵着的羊;可放置道具携带具体种类
    g.setToolFor(a, tool, placeKind ?? undefined);
    return true;
  },
  eatFood: (g, a, [kind]) => g.eatFood(kind ?? undefined, a),
  eatUntilFull: (g, a, [kind]) => g.eatUntilFull(kind ?? undefined, a),
  startFishing: (g, a) => g.startFishing(a),
  hookFish: (g, a) => g.hookFish(a),
  claimTreasure: (g, a) => g.claimTreasure(a),
  sleep: (g, a) => g.sleep(a),
  useFacility: (g, a, [kind]) => g.useFacilityItem(kind, a),
  baitBarrelFeed: (g, a, [kind, count]) => g.baitBarrelFeed(kind, count, a),
  baitBarrelCollect: (g, a) => g.baitBarrelCollect(a),
  baitBarrelTakeFoods: (g, a) => g.baitBarrelTakeFoods(a),
  brewBarrelFeed: (g, a, [kind, count]) => g.brewBarrelFeed(kind, count, a),
  brewBarrelCollect: (g, a) => g.brewBarrelCollect(a),
  brewBarrelTakeRaw: (g, a) => g.brewBarrelTakeRaw(a),
  smelterFeed: (g, a, [count]) => g.smelterFeed(count, a),
  smelterCollect: (g, a) => g.smelterCollect(a),
  smelterTakeOre: (g, a) => g.smelterTakeOre(a),
  cookingAddFuel: (g, a, [kind]) => g.cookingAddFuel(kind, a),
  cookingRoast: (g, a, [kind, count]) => g.cookingRoast(kind, count, a),
  cookingBoil: (g, a, [kind, count]) => g.cookingBoil(kind, count, a),
  cookingCollect: (g, a) => g.cookingCollect(a),
  cookingTakeBoil: (g, a) => g.cookingTakeBoil(a),
  loomFeed: (g, a, [count]) => g.loomFeed(count, a),
  loomCollect: (g, a) => g.loomCollect(a),
  loomTakeRope: (g, a) => g.loomTakeRope(a),
  useSeed: (g, a, [kind]) => g.useSeed(kind, a),
  useBottle: (g, a) => g.useBottle(a) !== null,
  pickupDrop: (g, a) => g.pickupDrop(a),
  crateStore: (g, a, [kind, count]) => g.crateStore(kind, count ?? Infinity, a),
  crateTake: (g, a, [kind, count]) => g.crateTake(kind, count ?? Infinity, a),
  campfireAddFuel: (g, a, [kind]) => g.campfireAddFuel(kind, a),
  campfireCook: (g, a, [kind, count]) => g.campfireCook(kind, count, a),
  dropItem: (g, a, [kind, count]) => g.dropItem(kind, count, a),
  moveItem: (g, a, [from, to]) => g.moveItem(from, to, a),
  sortInventory: (g, a) => g.sortInventory(a),
  equipItem: (g, a, [kind]) => g.equipItem(kind, a),
  unequipItem: (g, a, [slot]) => g.unequipItem(slot, a),
  craftTool: (g, a, [id]) => g.craftTool(id, a),
  craftAtWorkbench: (g, a, [id, count]) => g.craftAtWorkbench(id, count, a),
  upgradeWorkbench: (g, a) => g.upgradeWorkbench(a),
  // 客人本地判定命中后的权威结算(联机约定的例外:弓箭命中由射手客户端判定)
  arrowHit: (g, a, [kind, animalId, x, z]) => {
    const hit: ArrowHit =
      kind === 'wildlife'
        ? { kind: 'wildlife', animalId }
        : kind === 'crab'
          ? { kind: 'crab' }
          : { kind: 'bird' };
    a.archery.settleNetHit(hit, x, z);
    return true;
  },
  // 客人放箭的视觉广播:房主补动作与箭矢复现并转发给其他客人(命中走 arrowHit)
  arrowShot: (g, a, [dx, dz]) => {
    g.netArrowShot(a, dx, dz);
    return true;
  },
  // 客人本地判定剑命中后的权威结算:房主补挥砍动作(经姿态快照同步)并结算伤害/掉落
  swordHit: (g, a, [animalId]) => {
    if (a.tools.sword && a.player.currentTool === 'sword') {
      a.sword.netPlaySwing();
      a.sword.settleNetHit(animalId);
    }
    return true;
  },
  // 客人掷出套索的视觉广播:房主补甩索动作窗口、复现绳圈并转发给其他客人(道具在套中时经 lassoHit 扣)
  lassoThrow: (g, a, [dx, dz]) => {
    g.netLassoThrown(a, dx, dz);
    return true;
  },
  // 客人本地判定套中的权威结算(联机约定的例外:命中由掷出客户端判定,同弓箭;套中才扣道具)
  lassoHit: (g, a, [animalId, x, z]) => {
    a.lasso.settleNetHit(animalId, x, z);
    return true;
  },
  // 客人在脚下打桩拴住正牵着的羊
  lassoStake: (g, a) => g.stakeLasso(a),
  // 客人解开身旁被拴的羊(套索回客人背包)
  lassoUntie: (g, a) => g.untieLasso(a),
  // 客人空手挤奶:房主权威取走羊奶入客人背包(羊奶状态随姿态快照回流)
  milkSheep: (g, a, [sheepId, x, z]) => g.milkSheep(a, sheepId, x, z),
  gmSpawnAnimal: (g, a, [species]) => {
    g.gmSpawnAnimalFor(species, a);
    return true;
  },
  gmTriggerCrocodile: (g, a) => {
    g.gmTriggerCrocodileFor(a);
    return true;
  },
  gmGiveItem: (g, a, [kind, count]) => {
    g.gmGiveItem(kind, count, a);
    return true;
  },
  gmGiveTool: (g, a, [tool, tier]) => {
    g.gmGiveTool(tool, tier, a);
    return true;
  },
  gmSetGender: (g, a, [gender]) => {
    if (gender !== 'boy' && gender !== 'girl') return false;
    g.gmSetGender(gender, a);
    return true;
  },

  gmRestoreStatus: (g, a) => {
    g.gmRestoreStatus(a);
    return true;
  },
  gmSetTime: (g, a, [t]) => {
    g.gmSetTime(t);
    return true;
  },
  gmSetDay: (g, a, [day]) => {
    g.gmSetDay(day);
    return true;
  },
  gmSetWeather: (g, a, [type]) => {
    g.gmSetWeather(type);
    return true;
  },
  gmConfig: (g, a, [config]) => {
    g.gmApplyNetConfig(config);
    return true;
  },
};

/** 参数已通过 ActionProtocol 校验后，在这一处完成不可信数组到类型化元组的转换。 */
export function dispatchNetAction(
  game: Game,
  actor: PlayerSession,
  name: NetActionName,
  args: unknown[],
): boolean {
  const action = ACTIONS[name] as NetAction<NetActionName>;
  return action(game, actor, args as NetActionArgs[NetActionName]);
}

export function isNetActionName(name: string): name is NetActionName {
  return Object.prototype.hasOwnProperty.call(ACTIONS, name);
}
