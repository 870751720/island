import type { Game } from '../Game';
import type { PlayerSession } from '../mp/PlayerSession';
import type { EquipSlot } from '../systems/Equipment';
import type { HandTool } from '../entities/Player';
import type { CraftId } from '../systems/Crafting';
import type { ResourceKind } from '../systems/Inventory';

/** 客人动作 → Game 方法的参数化分发(以该客人的会话为 actor,由房主权威结算) */
export type NetAction = (game: Game, actor: PlayerSession, args: unknown[]) => boolean;

export const ACTIONS: Record<string, NetAction> = {
  tool: (g, a, [tool]) => {
    a.player.setTool(tool as HandTool);
    return true;
  },
  eatFood: (g, a, [kind]) => g.eatFood(kind as ResourceKind | undefined, a),
  startFishing: (g, a) => g.startFishing(a),
  hookFish: (g, a) => g.hookFish(a),
  sleep: (g, a) => g.sleep(a),
  useCrate: (g, a) => g.useCrate(a),
  useWorkbenchItem: (g, a, [kind]) => g.useWorkbenchItem(kind as ResourceKind, a),
  useBedItem: (g, a, [kind]) => g.useBedItem(kind as ResourceKind, a),
  useShrine: (g, a) => g.useShrine(a),
  useFenceItem: (g, a, [kind]) => g.useFenceItem(kind as ResourceKind, a),
  useSeed: (g, a, [kind]) => g.useSeed(kind as ResourceKind, a),
  useBottle: (g, a) => g.useBottle(a) !== null,
  useBush: (g, a, [kind]) => g.useBush(kind as 'berryBush' | 'shrubBush' | 'grassTuft', a),
  pickupDrop: (g, a) => g.pickupDrop(a),
  craftCampfire: (g, a) => g.craftCampfire(a),
  crateStore: (g, a, [kind]) => g.crateStore(kind as ResourceKind, a),
  crateTake: (g, a, [kind]) => g.crateTake(kind as ResourceKind, a),
  campfireAddFuel: (g, a, [kind]) => g.campfireAddFuel(kind as ResourceKind, a),
  campfireCook: (g, a, [kind, count]) => g.campfireCook(kind as ResourceKind, count as number, a),
  dropItem: (g, a, [kind, count]) => g.dropItem(kind as ResourceKind, count as number, a),
  moveItem: (g, a, [from, to]) => g.moveItem(from as number, to as number, a),
  equipItem: (g, a, [kind]) => g.equipItem(kind as ResourceKind, a),
  unequipItem: (g, a, [slot]) => g.unequipItem(slot as EquipSlot, a),
  craftTool: (g, a, [id]) => g.craftTool(id as CraftId, a),
  craftAtWorkbench: (g, a, [id, count]) => g.craftAtWorkbench(id as CraftId, count as number, a),
  craftWorkbench: (g, a) => g.craftWorkbench(a),
  upgradeWorkbench: (g, a) => g.upgradeWorkbench(a),
  gmGiveItem: (g, a, [kind, count]) => {
    g.gmGiveItem(kind as ResourceKind, count as number, a);
    return true;
  },
  gmGiveTool: (g, a, [tool, tier]) => {
    g.gmGiveTool(tool as never, tier as 1 | 2, a);
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
