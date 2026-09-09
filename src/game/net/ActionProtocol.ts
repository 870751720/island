import type { HandTool } from '../entities/Player';
import type { PlayerGender } from '../entities/PlayerModel';
import type { AnimalSpecies } from '../entities/Wildlife';
import type { CraftId, ToolId } from '../systems/Crafting';
import type { EquipSlot } from '../systems/Equipment';
import type { GmConfig } from '../systems/GmSystem';
import type { ResourceKind } from '../systems/Inventory';

/** 客人上行的动作名与参数元组；保持现有线格式，仅为发送端和注册表提供静态约束。 */
export interface NetActionArgs {
  tool: [tool: HandTool, placeKind: ResourceKind | null];
  eatFood: [kind?: ResourceKind];
  eatUntilFull: [kind?: ResourceKind];
  startFishing: [];
  hookFish: [];
  claimTreasure: [];
  sleep: [];
  useFacility: [kind: ResourceKind];
  baitBarrelFeed: [kind: ResourceKind, count: number];
  baitBarrelCollect: [];
  baitBarrelTakeFoods: [];
  brewBarrelFeed: [kind: ResourceKind, count: number];
  brewBarrelCollect: [];
  brewBarrelTakeRaw: [];
  smelterFeed: [count: number];
  smelterCollect: [];
  smelterTakeOre: [];
  cookingAddFuel: [kind: ResourceKind];
  cookingRoast: [kind: ResourceKind, count: number];
  cookingBoil: [kind: ResourceKind, count: number];
  cookingCollect: [];
  cookingTakeBoil: [];
  loomFeed: [count: number];
  loomCollect: [];
  loomTakeRope: [];
  useSeed: [kind: ResourceKind];
  useBottle: [];
  pickupDrop: [];
  crateStore: [kind: ResourceKind, count: number | null];
  crateTake: [kind: ResourceKind, count: number | null];
  campfireAddFuel: [kind: ResourceKind];
  campfireCook: [kind: ResourceKind, count: number];
  dropItem: [kind: ResourceKind, count: number];
  moveItem: [from: number, to: number];
  sortInventory: [];
  equipItem: [kind: ResourceKind];
  unequipItem: [slot: EquipSlot];
  craftTool: [id: CraftId];
  craftAtWorkbench: [id: CraftId, count: number];
  upgradeWorkbench: [];
  arrowHit: [kind: 'wildlife' | 'crab' | 'bird', animalId: number, x: number, z: number];
  arrowShot: [dx: number, dz: number];
  swordHit: [animalId: number];
  lassoThrow: [dx: number, dz: number];
  lassoHit: [animalId: number, x: number, z: number];
  lassoStake: [];
  lassoUntie: [];
  milkSheep: [sheepId: number, x: number, z: number];
  gmSpawnAnimal: [species: AnimalSpecies];
  gmTriggerCrocodile: [];
  gmGiveItem: [kind: ResourceKind, count: number];
  gmGiveTool: [tool: ToolId, tier: 1 | 2 | 3];
  gmSetGender: [gender: PlayerGender];
  gmRestoreStatus: [];
  gmSetTime: [time: number];
  gmSetDay: [day: number];
  gmSetWeather: [weather: 'sunny' | 'rain'];
  gmConfig: [config: GmConfig];
}

export type NetActionName = keyof NetActionArgs;

/** 线上动作允许的参数数量；与类型契约并列维护，供不可信消息进入房主前校验。 */
const NET_ACTION_ARG_COUNTS = {
  tool: [2],
  eatFood: [0, 1],
  eatUntilFull: [0, 1],
  startFishing: [0],
  hookFish: [0],
  claimTreasure: [0],
  sleep: [0],
  useFacility: [1],
  baitBarrelFeed: [2],
  baitBarrelCollect: [0],
  baitBarrelTakeFoods: [0],
  brewBarrelFeed: [2],
  brewBarrelCollect: [0],
  brewBarrelTakeRaw: [0],
  smelterFeed: [1],
  smelterCollect: [0],
  smelterTakeOre: [0],
  cookingAddFuel: [1],
  cookingRoast: [2],
  cookingBoil: [2],
  cookingCollect: [0],
  cookingTakeBoil: [0],
  loomFeed: [1],
  loomCollect: [0],
  loomTakeRope: [0],
  useSeed: [1],
  useBottle: [0],
  pickupDrop: [0],
  crateStore: [2],
  crateTake: [2],
  campfireAddFuel: [1],
  campfireCook: [2],
  dropItem: [2],
  moveItem: [2],
  sortInventory: [0],
  equipItem: [1],
  unequipItem: [1],
  craftTool: [1],
  craftAtWorkbench: [2],
  upgradeWorkbench: [0],
  arrowHit: [4],
  arrowShot: [2],
  swordHit: [1],
  lassoThrow: [2],
  lassoHit: [3],
  lassoStake: [0],
  lassoUntie: [0],
  milkSheep: [3],
  gmSpawnAnimal: [1],
  gmTriggerCrocodile: [0],
  gmGiveItem: [2],
  gmGiveTool: [2],
  gmSetGender: [1],
  gmRestoreStatus: [0],
  gmSetTime: [1],
  gmSetDay: [1],
  gmSetWeather: [1],
  gmConfig: [1],
} as const satisfies Record<NetActionName, readonly number[]>;

export function hasValidNetActionArity<Name extends NetActionName>(
  name: Name,
  args: unknown[],
): boolean {
  return (NET_ACTION_ARG_COUNTS[name] as readonly number[]).includes(args.length);
}
