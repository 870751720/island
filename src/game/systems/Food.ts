import type { ActionType } from '../entities/Player';
import type { InventorySlot, ResourceKind } from './Inventory';

/** 可食用食物:每种食物有各自的进食动画与特效色 */
export type Food = {
  kind: ResourceKind;
  name: string;
  icon: string;
  action: ActionType;
  fxColor: string;
  hunger: number;
  thirst: number;
  health: number;
};

/** 可食用食物表:每种食物的名称、进食动画与特效色 */
export const FOODS: Food[] = [
  { kind: 'berry', name: '浆果', icon: '🍒', action: 'eat_berry', fxColor: '#c0392b', hunger: 8, thirst: 4, health: 0 },
  { kind: 'oakFruit', name: '橡果', icon: '🌰', action: 'eat_berry', fxColor: '#b5813f', hunger: 1, thirst: 0, health: 0 },
  { kind: 'pineFruit', name: '松果', icon: '🌲', action: 'eat_berry', fxColor: '#8a6b45', hunger: 1, thirst: 0, health: 0 },
  { kind: 'fruitFruit', name: '红果', icon: '🍎', action: 'eat_berry', fxColor: '#c0392b', hunger: 10, thirst: 5, health: 0 },
  { kind: 'cola', name: '可乐', icon: '🥤', action: 'eat_berry', fxColor: '#c0392b', hunger: 5, thirst: 10, health: 0 },
  { kind: 'colaZero', name: '无糖可乐', icon: '🥤', action: 'eat_berry', fxColor: '#2c3e50', hunger: 0, thirst: 5, health: 0 },
  { kind: 'milk', name: '羊奶', icon: '🥛', action: 'eat_berry', fxColor: '#f6f1e4', hunger: 10, thirst: 60, health: 5 },
  { kind: 'sardine', name: '沙丁鱼', icon: '🐟', action: 'eat_fish', fxColor: '#b8cdd9', hunger: 10, thirst: 5, health: 0 },
  { kind: 'shrimp', name: '虾', icon: '🦐', action: 'eat_fish', fxColor: '#e8927c', hunger: 10, thirst: 5, health: 0 },
  { kind: 'loach', name: '泥鳅', icon: '🐟', action: 'eat_fish', fxColor: '#8a7a4a', hunger: 10, thirst: 5, health: 0 },
  { kind: 'perch', name: '鲈鱼', icon: '🐠', action: 'eat_fish', fxColor: '#8fa87b', hunger: 10, thirst: 5, health: 0 },
  { kind: 'puffer', name: '河豚', icon: '🐡', action: 'eat_fish', fxColor: '#d9c15a', hunger: 10, thirst: 5, health: 0 },
  { kind: 'cuttlefish', name: '墨鱼', icon: '🦑', action: 'eat_fish', fxColor: '#6b5f8a', hunger: 10, thirst: 5, health: 0 },
  { kind: 'anchovy', name: '鳀鱼', icon: '🐟', action: 'eat_fish', fxColor: '#a9c3cc', hunger: 10, thirst: 5, health: 0 },
  { kind: 'horseMackerel', name: '竹荚鱼', icon: '🐠', action: 'eat_fish', fxColor: '#8ba3a0', hunger: 10, thirst: 5, health: 0 },
  { kind: 'yellowCroaker', name: '小黄鱼', icon: '🐠', action: 'eat_fish', fxColor: '#e3c56d', hunger: 10, thirst: 5, health: 0 },
  { kind: 'saury', name: '秋刀鱼', icon: '🐟', action: 'eat_fish', fxColor: '#7d97a8', hunger: 10, thirst: 5, health: 0 },
  { kind: 'hairtail', name: '带鱼', icon: '🐟', action: 'eat_fish', fxColor: '#cfd8dc', hunger: 10, thirst: 5, health: 0 },
  { kind: 'grouper', name: '石斑鱼', icon: '🐠', action: 'eat_fish', fxColor: '#6d7b5a', hunger: 20, thirst: 10, health: 0 },
  { kind: 'catfish', name: '巨鲶', icon: '🐡', action: 'eat_fish', fxColor: '#5b664f', hunger: 20, thirst: 10, health: 0 },
  { kind: 'grassCarp', name: '草鱼', icon: '🐠', action: 'eat_fish', fxColor: '#7ba05b', hunger: 20, thirst: 10, health: 0 },
  { kind: 'swordfish', name: '剑鱼', icon: '🗡️', action: 'eat_fish', fxColor: '#5a7d9e', hunger: 20, thirst: 10, health: 0 },
  { kind: 'manta', name: '魔鬼鱼', icon: '🪁', action: 'eat_fish', fxColor: '#4a5568', hunger: 20, thirst: 10, health: 0 },
  { kind: 'goldenFish', name: '黄金鱼', icon: '✨', action: 'eat_fish', fxColor: '#e6b422', hunger: 50, thirst: 50, health: 50 },
  { kind: 'crabMeat', name: '蟹肉', icon: '🦀', action: 'eat_fish', fxColor: '#e2793a', hunger: 5, thirst: 2, health: 0 },
  { kind: 'birdMeat', name: '鸟肉', icon: '🐦', action: 'eat_fish', fxColor: '#c98a5a', hunger: 5, thirst: 2, health: 0 },
  { kind: 'gameMeat', name: '兽肉', icon: '🥩', action: 'eat_fish', fxColor: '#b04a3a', hunger: 10, thirst: 5, health: 0 },
  { kind: 'cookedBerry', name: '烤浆果', icon: '🍬', action: 'eat_berry', fxColor: '#a0522d', hunger: 13, thirst: 1, health: 1 },
  { kind: 'cookedSmallFish', name: '烤小鱼', icon: '🍢', action: 'eat_fish', fxColor: '#d99a4e', hunger: 20, thirst: 10, health: 10 },
  { kind: 'cookedBigFish', name: '烤大鱼', icon: '🍡', action: 'eat_fish', fxColor: '#c76b3a', hunger: 40, thirst: 20, health: 20 },
  { kind: 'cookedGoldenFish', name: '烤黄金鱼', icon: '🌟', action: 'eat_fish', fxColor: '#e6b422', hunger: 100, thirst: 100, health: 100 },
  { kind: 'cookedCrabMeat', name: '烤蟹肉', icon: '🍤', action: 'eat_fish', fxColor: '#e8703a', hunger: 8, thirst: 1, health: 2 },
  { kind: 'cookedBirdMeat', name: '烤鸟肉', icon: '🍗', action: 'eat_fish', fxColor: '#b5722f', hunger: 8, thirst: 1, health: 2 },
  { kind: 'cookedGameMeat', name: '烤兽肉', icon: '🍖', action: 'eat_fish', fxColor: '#9c4a2f', hunger: 30, thirst: 20, health: 20 },
  { kind: 'boiledBerry', name: '煮浆果', icon: '🫐', action: 'eat_berry', fxColor: '#7a5cb0', hunger: 16, thirst: 9, health: 2 },
  { kind: 'boiledSmallFish', name: '鲜鱼汤', icon: '🥣', action: 'eat_fish', fxColor: '#d9b98a', hunger: 15, thirst: 20, health: 12 },
  { kind: 'boiledBigFish', name: '大鱼汤', icon: '🍲', action: 'eat_fish', fxColor: '#c9a06a', hunger: 25, thirst: 40, health: 24 },
  { kind: 'boiledGoldenFish', name: '黄金鱼汤', icon: '✨', action: 'eat_fish', fxColor: '#e6b422', hunger: 100, thirst: 100, health: 100 },
  { kind: 'boiledCrabMeat', name: '煮蟹肉', icon: '🍲', action: 'eat_fish', fxColor: '#e07a5a', hunger: 10, thirst: 5, health: 3 },
  { kind: 'boiledBirdMeat', name: '鸟肉汤', icon: '🍜', action: 'eat_fish', fxColor: '#c4a06a', hunger: 10, thirst: 5, health: 3 },
  { kind: 'boiledGameMeat', name: '兽肉汤', icon: '🍲', action: 'eat_fish', fxColor: '#a06a4a', hunger: 15, thirst: 28, health: 24 },
];

/** 饵料桶兑换表:每 1 个食物发酵出的鱼饵数(不在表内的食物不可投入);熟食与生食兑换相同,大体按获取难度定价:基础采集 2、小鱼/肉 4-6、大鱼 10、兽肉 10、黄金鱼 40 */
export const BAIT_YIELD: Partial<Record<ResourceKind, number>> = {
  worm: 2,
  oakFruit: 2,
  pineFruit: 2,
  berry: 2,
  cola: 2,
  colaZero: 2,
  fruitFruit: 4,
  sardine: 4,
  shrimp: 4,
  loach: 4,
  perch: 4,
  puffer: 4,
  cuttlefish: 4,
  anchovy: 4,
  horseMackerel: 4,
  yellowCroaker: 4,
  saury: 4,
  hairtail: 4,
  crabMeat: 4,
  birdMeat: 6,
  grouper: 10,
  catfish: 10,
  grassCarp: 10,
  swordfish: 10,
  manta: 10,
  gameMeat: 10,
  goldenFish: 40,
  cookedBerry: 2,
  cookedCrabMeat: 4,
  cookedBirdMeat: 6,
  cookedSmallFish: 4,
  cookedBigFish: 10,
  cookedGameMeat: 10,
  cookedGoldenFish: 40,
};

/** 烹饪映射:生食在燃烧的火堆上烤成熟食,效果增强;不可烤的食材不在表中 */
export const COOKABLE: Partial<Record<ResourceKind, ResourceKind>> = {  berry: 'cookedBerry',
  sardine: 'cookedSmallFish',
  shrimp: 'cookedSmallFish',
  loach: 'cookedSmallFish',
  perch: 'cookedSmallFish',
  puffer: 'cookedSmallFish',
  cuttlefish: 'cookedSmallFish',
  anchovy: 'cookedSmallFish',
  horseMackerel: 'cookedSmallFish',
  yellowCroaker: 'cookedSmallFish',
  saury: 'cookedSmallFish',
  hairtail: 'cookedSmallFish',
  grouper: 'cookedBigFish',
  catfish: 'cookedBigFish',
  grassCarp: 'cookedBigFish',
  swordfish: 'cookedBigFish',
  manta: 'cookedBigFish',
  goldenFish: 'cookedGoldenFish',
  crabMeat: 'cookedCrabMeat',
  birdMeat: 'cookedBirdMeat',
  gameMeat: 'cookedGameMeat',
};

/** 可烹饪(烤或煮)的生食材种类,供背包检查等场景遍历 */
export const COOKABLE_KINDS = Object.keys(COOKABLE) as ResourceKind[];

/**
 * 煮制映射:生食在燃烧的烹饪台上煮成汤品(每份 5 秒,一次只能煮一种食材);
 * 与烤制同源,但汤品口渴恢复更高、饥饿略低。不可煮的食材不在表中。
 */
export const BOILABLE: Partial<Record<ResourceKind, ResourceKind>> = {
  berry: 'boiledBerry',
  sardine: 'boiledSmallFish',
  shrimp: 'boiledSmallFish',
  loach: 'boiledSmallFish',
  perch: 'boiledSmallFish',
  puffer: 'boiledSmallFish',
  cuttlefish: 'boiledSmallFish',
  anchovy: 'boiledSmallFish',
  horseMackerel: 'boiledSmallFish',
  yellowCroaker: 'boiledSmallFish',
  saury: 'boiledSmallFish',
  hairtail: 'boiledSmallFish',
  grouper: 'boiledBigFish',
  catfish: 'boiledBigFish',
  grassCarp: 'boiledBigFish',
  swordfish: 'boiledBigFish',
  manta: 'boiledBigFish',
  goldenFish: 'boiledGoldenFish',
  crabMeat: 'boiledCrabMeat',
  birdMeat: 'boiledBirdMeat',
  gameMeat: 'boiledGameMeat',
};

/** 按背包格子顺序找第一个食物(「背包里最前面的食物」) */
export function firstFoodIn(slots: readonly InventorySlot[]): Food | undefined {
  for (const slot of slots) {
    if (!slot) continue;
    const food = FOODS.find((f) => f.kind === slot.kind);
    if (food) return food;
  }
  return undefined;
}

/** 进食卡片的弹出阈值:饥饿低于该值才提示(%) */
export const EAT_PROMPT_HUNGER = 20;

/** 按背包格子顺序找第一个食物及其总持有数(进食卡「吃饱」按钮按数量决定是否出现) */
export function firstFoodEntryIn(
  slots: readonly InventorySlot[]
): { food: Food; count: number } | undefined {
  for (const slot of slots) {
    if (!slot) continue;
    const food = FOODS.find((f) => f.kind === slot.kind);
    if (food) {
      const count = slots.reduce((n, s) => (s && s.kind === slot.kind ? n + s.count : n), 0);
      return { food, count };
    }
  }
  return undefined;
}
