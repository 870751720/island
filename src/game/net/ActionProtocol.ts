import { validResearch, hiddenRecipe, HIDDEN_RECIPES } from '../systems/HiddenRecipes';
import { DOG_GM_COMMANDS, type DogGmCommand } from '../systems/DogGrowth';
import { isLandmarkChoice, type LandmarkChoice } from '../world/landmarks/LandmarkDefinitions';
import type { HandTool } from '../entities/Player';
import type { AnimalSpecies } from '../entities/Wildlife';
import type { CraftId, ToolId } from '../systems/Crafting';
import type { EquipSlot } from '../systems/Equipment';
import type { GmConfig } from '../systems/GmSystem';
import type { ResourceKind } from '../systems/Inventory';
import { isCraftId } from '../systems/Crafting';
import { isResourceKind } from '../systems/Items';
import { EMOJI_GLYPHS } from '../social/Emojis';

/** 客人上行的动作名与参数元组；保持现有线格式，仅为发送端和注册表提供静态约束。 */
export interface NetActionArgs {
  workFinish: [system: string, target: string];
  collectHit: [id: string, phase: string];
  drinkRound: [];
  craftFinish: [id: CraftId];
  eatPortion: [kind: ResourceKind];
  place: [kind: ResourceKind | 'soil', x: number, z: number];
  questScreen: [matrix: number[] | null];
  questGuide: [enabled: boolean];
  tool: [tool: HandTool, placeKind: ResourceKind | null];
  startFishing: [cast: number];
  fishCaught: [cast: number];
  fishCancel: [cast: number];
  sleep: [];
  baitBarrelFeed: [kind: ResourceKind, count: number];
  baitBarrelCollect: [];
  baitBarrelTakeFoods: [];
  brewBarrelFeed: [kind: ResourceKind, count: number];
  brewBarrelCollect: [];
  brewBarrelTakeRaw: [];
  smelterFeed: [count: number];
  smelterAddFuel: [kind: ResourceKind];
  smelterCollect: [];
  smelterTakeOre: [];
  cookingAddFuel: [kind: ResourceKind];
  cookingBoil: [kind: ResourceKind, count: number];
  cookingCollect: [];
  cookingTakeBoil: [];
  loomFeed: [count: number];
  millFeed: [count: number];
  researchStart: [kinds: ResourceKind[]];
  syncRecipeDiscoveries: [kinds: ResourceKind[]];
  loomCollect: [];
  millCollect: [];
  loomTakeRope: [];
  millTakeWheat: [];
  useBottle: [];
  pickupDrop: [];
  crateStore: [kind: ResourceKind, count: number | null];
  crateTake: [kind: ResourceKind, count: number | null];
  campfireAddFuel: [kind: ResourceKind];
  dropItem: [kind: ResourceKind, count: number];
  moveItem: [from: number, to: number];
  sortInventory: [];
  equipItem: [kind: ResourceKind];
  unequipItem: [slot: EquipSlot];
  arrowHit: [kind: 'wildlife' | 'crab' | 'bird', animalId: number, x: number, z: number];
  arrowShot: [dx: number, dz: number];
  swordHit: [animalId: number];
  lassoThrow: [dx: number, dz: number];
  lassoHit: [animalId: number, x: number, z: number];
  lassoStake: [];
  lassoUntie: [];
  harvestAnimal: [animalId: number, wool: boolean];
  gmDog: [command: DogGmCommand, value: number];
  gmSpawnAnimal: [species: AnimalSpecies, juvenile?: boolean];
  gmSpawnLandmark: [choice: LandmarkChoice];
  gmTriggerCrocodile: [];
  gmUnlockDiscoveries: [];
  gmGiveItem: [kind: ResourceKind, count: number];
  gmGiveTool: [tool: ToolId, tier: 1 | 2 | 3];
  gmSetDay: [day: number];
  gmSetWeather: [weather: 'sunny' | 'wind' | 'rain' | 'snow'];
  gmConfig: [config: GmConfig];
  playEmoji: [glyph: string];
}

export type NetActionName = keyof NetActionArgs;

/** 线上动作允许的参数数量；与类型契约并列维护，供不可信消息进入房主前校验。 */
const NET_ACTION_ARG_COUNTS = {
  workFinish: [2],
  collectHit: [2],
  drinkRound: [0],
  craftFinish: [1],
  eatPortion: [1],
  place: [3],
  questScreen: [1],
  questGuide: [1],
  tool: [2],
  startFishing: [1],
  fishCaught: [1],
  fishCancel: [1],
  sleep: [0],
  baitBarrelFeed: [2],
  baitBarrelCollect: [0],
  baitBarrelTakeFoods: [0],
  brewBarrelFeed: [2],
  brewBarrelCollect: [0],
  brewBarrelTakeRaw: [0],
  smelterFeed: [1],
  smelterAddFuel: [1],
  smelterCollect: [0],
  smelterTakeOre: [0],
  cookingAddFuel: [1],
  cookingBoil: [2],
  cookingCollect: [0],
  cookingTakeBoil: [0],
  loomFeed: [1],
  millFeed: [1],
  researchStart: [1],
  syncRecipeDiscoveries: [1],
  loomCollect: [0],
  millCollect: [0],
  loomTakeRope: [0],
  millTakeWheat: [0],
  useBottle: [0],
  pickupDrop: [0],
  crateStore: [2],
  crateTake: [2],
  campfireAddFuel: [1],
  dropItem: [2],
  moveItem: [2],
  sortInventory: [0],
  equipItem: [1],
  unequipItem: [1],
  arrowHit: [4],
  arrowShot: [2],
  swordHit: [1],
  lassoThrow: [2],
  lassoHit: [3],
  lassoStake: [0],
  lassoUntie: [0],
  harvestAnimal: [2],
  gmDog: [2],
  gmSpawnAnimal: [1, 2],
  gmSpawnLandmark: [1],
  gmTriggerCrocodile: [0],
  gmUnlockDiscoveries: [0],
  gmGiveItem: [2],
  gmGiveTool: [2],
  gmSetDay: [1],
  gmSetWeather: [1],
  gmConfig: [1],
  playEmoji: [1],
} as const satisfies Record<NetActionName, readonly number[]>;

const HAND_TOOLS: ReadonlySet<string> = new Set([
  'hand', 'axe', 'pickaxe', 'shovel', 'hoe', 'fishingrod', 'bow', 'sword', 'lasso', 'shears', 'fence', 'fenceGate', 'place',
]);
const EQUIP_SLOTS: ReadonlySet<string> = new Set(['clothing', 'pants', 'hat', 'backpack', 'mount']);
const ANIMAL_SPECIES: ReadonlySet<string> = new Set(['rabbit', 'sheep', 'bison', 'wolf', 'bear', 'crocodile']);
const TOOL_IDS: ReadonlySet<string> = new Set(['axe', 'pickaxe', 'shovel', 'hoe', 'fishingrod', 'bow', 'sword', 'shears']);

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/** 校验来自 DataChannel 的不可信参数，合法后才允许进入房主权威结算。 */
export function hasValidNetActionArgs(name: NetActionName, args: unknown[]): boolean {
  if (!(NET_ACTION_ARG_COUNTS[name] as readonly number[]).includes(args.length)) return false;
  const [first, second, third, fourth] = args;

  switch (name) {
    case 'researchStart': return validResearch(first);
    case 'syncRecipeDiscoveries': return Array.isArray(first) && first.length <= HIDDEN_RECIPES.length && first.every(k => typeof k === 'string' && hiddenRecipe(k));
    case 'sleep':
    case 'baitBarrelCollect':
    case 'baitBarrelTakeFoods':
    case 'brewBarrelCollect':
    case 'brewBarrelTakeRaw':
    case 'smelterCollect':
    case 'smelterTakeOre':
    case 'cookingCollect':
    case 'cookingTakeBoil':
    case 'loomCollect':
    case 'millCollect':
    case 'loomTakeRope':
    case 'millTakeWheat':
    case 'useBottle':
    case 'pickupDrop':
    case 'sortInventory':
    case 'lassoStake':
    case 'lassoUntie':
    case 'gmTriggerCrocodile':
    case 'gmUnlockDiscoveries':
      return true;
    case 'collectHit':
    case 'workFinish':
      return typeof first === 'string' && first.length <= 100 && typeof second === 'string' && second.length <= 100;
    case 'drinkRound':
      return true;
    case 'eatPortion':
      return isResourceKind(first);
    case 'place':
      return (first === 'soil' || isResourceKind(first)) && isFiniteNumber(second) && isFiniteNumber(third);
    case 'questScreen':
      return first === null || (Array.isArray(first) && first.length === 16 && first.every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 10000));
    case 'questGuide':
      return typeof first === 'boolean';
    case 'tool':
      return isString(first) && HAND_TOOLS.has(first) && (second === null || isResourceKind(second));
    case 'cookingAddFuel':
    case 'smelterAddFuel':
    case 'campfireAddFuel':
    case 'equipItem':
      return isResourceKind(first);
    case 'craftFinish':
      return isCraftId(first);
    case 'startFishing':
    case 'fishCaught':
    case 'fishCancel':
      return isSafeInteger(first) && first > 0;
    case 'unequipItem':
      return isString(first) && EQUIP_SLOTS.has(first);
    case 'baitBarrelFeed':
    case 'brewBarrelFeed':
    case 'cookingBoil':
    case 'dropItem':
    case 'gmGiveItem':
      return isResourceKind(first) && isSafeInteger(second);
    case 'smelterFeed':
    case 'loomFeed':
    case 'millFeed':
    case 'swordHit':
      return isSafeInteger(first);
    case 'crateStore':
    case 'crateTake':
      return isResourceKind(first) && (second === null || isSafeInteger(second));
    case 'moveItem':
      return isSafeInteger(first) && isSafeInteger(second);
    case 'arrowHit':
      return (first === 'wildlife' || first === 'crab' || first === 'bird')
        && isSafeInteger(second) && isFiniteNumber(third) && isFiniteNumber(fourth);
    case 'arrowShot':
    case 'lassoThrow':
      return isFiniteNumber(first) && isFiniteNumber(second);
    case 'lassoHit':
      return isSafeInteger(first) && isFiniteNumber(second) && isFiniteNumber(third);
    case 'harvestAnimal':
      return isSafeInteger(first) && typeof second === 'boolean';
    case 'gmSpawnAnimal':
      return isString(first) && ANIMAL_SPECIES.has(first)
        && (second === undefined || typeof second === 'boolean');
    case 'gmSpawnLandmark':
      return isLandmarkChoice(first);
    case 'gmGiveTool':
      return isString(first) && TOOL_IDS.has(first) && (second === 1 || second === 2 || second === 3);
    case 'gmSetDay':
      return isSafeInteger(first);
    case 'gmSetWeather':
      return first === 'sunny' || first === 'wind' || first === 'rain' || first === 'snow';
    case 'gmDog':
      return typeof first === 'string' && DOG_GM_COMMANDS.includes(first as DogGmCommand)
        && isFiniteNumber(second) && second >= 0 && second <= 1500
        && (first !== 'stage' || (Number.isInteger(second) && second >= 1 && second <= 5));
    case 'gmConfig':
      return typeof first === 'object' && first !== null && !Array.isArray(first);
    case 'playEmoji':
      return isString(first) && EMOJI_GLYPHS.has(first);
  }
}
