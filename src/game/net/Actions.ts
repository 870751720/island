import type { Game } from '../Game';
import type { PlayerSession } from '../mp/PlayerSession';
import type { EquipSlot } from '../systems/Equipment';
import type { HandTool } from '../entities/Player';
import type { CraftId } from '../systems/Crafting';
import type { ResourceKind } from '../systems/Inventory';
import type { ArrowHit } from '../systems/BowSystem';
import type { AnimalSpecies } from '../entities/Wildlife';
import type { ShrineKind } from '../entities/Shrine';

/** 客人动作 → Game 方法的参数化分发(以该客人的会话为 actor,由房主权威结算) */
export type NetAction = (game: Game, actor: PlayerSession, args: unknown[]) => boolean;

export const ACTIONS: Record<string, NetAction> = {
  tool: (g, a, [tool]) => {
    // 走 Game 的统一入口:切走套索时先松开正牵着的羊
    g.setToolFor(a, tool as HandTool);
    return true;
  },
  eatFood: (g, a, [kind]) => g.eatFood(kind as ResourceKind | undefined, a),
  eatUntilFull: (g, a, [kind]) => g.eatUntilFull(kind as ResourceKind | undefined, a),
  startFishing: (g, a) => g.startFishing(a),
  hookFish: (g, a) => g.hookFish(a),
  claimTreasure: (g, a) => g.claimTreasure(a),
  sleep: (g, a) => g.sleep(a),
  useCrate: (g, a, [kind]) => g.useCrate(kind as 'crate' | 'ironCrate', a),
  useBaitBarrel: (g, a) => g.useBaitBarrel(a),
  useWaterPurifier: (g, a) => g.useWaterPurifier(a),
  baitBarrelFeed: (g, a, [kind]) => g.baitBarrelFeed(kind as ResourceKind, a),
  baitBarrelCollect: (g, a) => g.baitBarrelCollect(a),
  useSmelter: (g, a) => g.useSmelter(a),
  smelterFeed: (g, a) => g.smelterFeed(a),
  smelterCollect: (g, a) => g.smelterCollect(a),
  useCookingStation: (g, a) => g.useCookingStation(a),
  cookingAddFuel: (g, a, [kind]) => g.cookingAddFuel(kind as ResourceKind, a),
  cookingRoast: (g, a, [kind, count]) => g.cookingRoast(kind as ResourceKind, count as number, a),
  cookingBoil: (g, a, [kind, count]) => g.cookingBoil(kind as ResourceKind, count as number, a),
  cookingCollect: (g, a) => g.cookingCollect(a),
  useLoom: (g, a) => g.useLoom(a),
  loomFeed: (g, a) => g.loomFeed(a),
  loomCollect: (g, a) => g.loomCollect(a),
  useWorkbenchItem: (g, a, [kind]) => g.useWorkbenchItem(kind as ResourceKind, a),
  useBedItem: (g, a, [kind]) => g.useBedItem(kind as ResourceKind, a),
  useShrine: (g, a, [kind]) => g.useShrine(a, kind as ShrineKind),
  useFenceItem: (g, a, [kind]) => g.useFenceItem(kind as ResourceKind, a),
  useSeed: (g, a, [kind]) => g.useSeed(kind as ResourceKind, a),
  useBottle: (g, a) => g.useBottle(a) !== null,
  useBush: (g, a, [kind]) => g.useBush(kind as 'berryBush' | 'shrubBush' | 'grassTuft', a),
  pickupDrop: (g, a) => g.pickupDrop(a),
  craftCampfire: (g, a) => g.craftCampfire(a),
  crateStore: (g, a, [kind, count]) => g.crateStore(kind as ResourceKind, (count as number) ?? Infinity, a),
  crateTake: (g, a, [kind, count]) => g.crateTake(kind as ResourceKind, (count as number) ?? Infinity, a),
  campfireAddFuel: (g, a, [kind]) => g.campfireAddFuel(kind as ResourceKind, a),
  campfireCook: (g, a, [kind, count]) => g.campfireCook(kind as ResourceKind, count as number, a),
  dropItem: (g, a, [kind, count]) => g.dropItem(kind as ResourceKind, count as number, a),
  moveItem: (g, a, [from, to]) => g.moveItem(from as number, to as number, a),
  sortInventory: (g, a) => g.sortInventory(a),
  equipItem: (g, a, [kind]) => g.equipItem(kind as ResourceKind, a),
  unequipItem: (g, a, [slot]) => g.unequipItem(slot as EquipSlot, a),
  craftTool: (g, a, [id]) => g.craftTool(id as CraftId, a),
  craftAtWorkbench: (g, a, [id, count]) => g.craftAtWorkbench(id as CraftId, count as number, a),
  craftWorkbench: (g, a) => g.craftWorkbench(a),
  upgradeWorkbench: (g, a) => g.upgradeWorkbench(a),
  // 客人本地判定命中后的权威结算(联机约定的例外:弓箭命中由射手客户端判定)
  arrowHit: (g, a, [kind, animalId, x, z]) => {
    const hit: ArrowHit =
      kind === 'wildlife'
        ? { kind: 'wildlife', animalId: animalId as number }
        : kind === 'crab'
          ? { kind: 'crab' }
          : { kind: 'bird' };
    a.archery.settleNetHit(hit, x as number, z as number);
    return true;
  },
  // 客人放箭的视觉广播:房主补动作与箭矢复现并转发给其他客人(命中走 arrowHit)
  arrowShot: (g, a, [dx, dz]) => {
    g.netArrowShot(a, dx as number, dz as number);
    return true;
  },
  // 客人本地判定剑命中后的权威结算:房主补挥砍动作(经姿态快照同步)并结算伤害/掉落
  swordHit: (g, a, [animalId]) => {
    if (a.tools.sword && a.player.currentTool === 'sword') {
      a.sword.netPlaySwing();
      a.sword.settleNetHit(animalId as number);
    }
    return true;
  },
  // 客人掷出套索的视觉广播与扣道具:房主扣一个套索、补甩索动作窗口、复现绳圈并转发给其他客人
  lassoThrow: (g, a, [dx, dz]) => {
    g.netLassoThrown(a, dx as number, dz as number);
    return true;
  },
  // 客人本地判定套中的权威结算(联机约定的例外:命中由掷出客户端判定,同弓箭)
  lassoHit: (g, a, [animalId, x, z]) => {
    a.lasso.settleNetHit(animalId as number, x as number, z as number);
    return true;
  },
  // 客人掷空:套索掉在落点(世界增量回流补建掉落物)
  lassoMiss: (g, a, [x, z]) => {
    g.lassoMissAt(x as number, z as number);
    return true;
  },
  // 客人在脚下打桩拴住正牵着的羊
  lassoStake: (g, a) => g.stakeLasso(a),
  // 客人解开身旁被拴的羊(套索回客人背包)
  lassoUntie: (g, a) => g.untieLasso(a),
  gmSpawnAnimal: (g, a, [species]) => {
    g.gmSpawnAnimalFor(species as AnimalSpecies, a);
    return true;
  },
  gmTriggerCrocodile: (g, a) => {
    g.gmTriggerCrocodileFor(a);
    return true;
  },
  gmGiveItem: (g, a, [kind, count]) => {
    g.gmGiveItem(kind as ResourceKind, count as number, a);
    return true;
  },
  gmGiveTool: (g, a, [tool, tier]) => {
    g.gmGiveTool(tool as never, tier as 1 | 2 | 3, a);
    return true;
  },
  gmRestoreStatus: (g, a) => {
    g.gmRestoreStatus(a);
    return true;
  },
  gmSetTime: (g, a, [t]) => {
    g.gmSetTime(t as number);
    return true;
  },
  gmSetWeather: (g, a, [type]) => {
    g.gmSetWeather(type as 'sunny' | 'rain');
    return true;
  },
  gmConfig: (g, a, [config]) => {
    g.gmApplyNetConfig(config);
    return true;
  },
};
