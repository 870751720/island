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
};

/** 可食用食物表:每种食物的名称、进食动画与特效色 */
export const FOODS: Food[] = [
  { kind: 'berry', name: '浆果', icon: '🍒', action: 'eat_berry', fxColor: '#c0392b', hunger: 12, thirst: 4 },
  { kind: 'oakFruit', name: '橡果', icon: '🥜', action: 'eat_berry', fxColor: '#b5813f', hunger: 10, thirst: 3 },
  { kind: 'pineFruit', name: '松果', icon: '🌲', action: 'eat_berry', fxColor: '#8a6b45', hunger: 10, thirst: 3 },
  { kind: 'fruitFruit', name: '红果', icon: '🍎', action: 'eat_berry', fxColor: '#c0392b', hunger: 12, thirst: 5 },
  { kind: 'cola', name: '可乐', icon: '🥤', action: 'eat_berry', fxColor: '#c0392b', hunger: 15, thirst: 10 },
  { kind: 'colaZero', name: '无糖可乐', icon: '🥤', action: 'eat_berry', fxColor: '#2c3e50', hunger: 0, thirst: 18 },
  { kind: 'sardine', name: '沙丁鱼', icon: '🐟', action: 'eat_fish', fxColor: '#b8cdd9', hunger: 15, thirst: 0 },
  { kind: 'shrimp', name: '虾', icon: '🦐', action: 'eat_fish', fxColor: '#e8927c', hunger: 14, thirst: 0 },
  { kind: 'loach', name: '泥鳅', icon: '🐟', action: 'eat_fish', fxColor: '#8a7a4a', hunger: 16, thirst: 0 },
  { kind: 'perch', name: '鲈鱼', icon: '🐠', action: 'eat_fish', fxColor: '#8fa87b', hunger: 22, thirst: 0 },
  { kind: 'puffer', name: '河豚', icon: '🐡', action: 'eat_fish', fxColor: '#d9c15a', hunger: 24, thirst: 0 },
  { kind: 'cuttlefish', name: '墨鱼', icon: '🦑', action: 'eat_fish', fxColor: '#6b5f8a', hunger: 20, thirst: 0 },
  { kind: 'grouper', name: '石斑鱼', icon: '🐠', action: 'eat_fish', fxColor: '#6d7b5a', hunger: 45, thirst: 0 },
  { kind: 'catfish', name: '巨鲶', icon: '🐡', action: 'eat_fish', fxColor: '#5b664f', hunger: 48, thirst: 0 },
  { kind: 'swordfish', name: '剑鱼', icon: '🗡️', action: 'eat_fish', fxColor: '#5a7d9e', hunger: 50, thirst: 0 },
  { kind: 'manta', name: '魔鬼鱼', icon: '🪁', action: 'eat_fish', fxColor: '#4a5568', hunger: 46, thirst: 0 },
  { kind: 'goldenFish', name: '黄金鱼', icon: '✨', action: 'eat_fish', fxColor: '#e6b422', hunger: 60, thirst: 40 },
  { kind: 'crabMeat', name: '蟹肉', icon: '🦀', action: 'eat_fish', fxColor: '#e2793a', hunger: 15, thirst: 0 },
  { kind: 'birdMeat', name: '鸟肉', icon: '🐦', action: 'eat_fish', fxColor: '#c98a5a', hunger: 18, thirst: 0 },
  { kind: 'gameMeat', name: '兽肉', icon: '🍖', action: 'eat_fish', fxColor: '#b04a3a', hunger: 20, thirst: 0 },
  { kind: 'cookedBerry', name: '烤浆果', icon: '🍬', action: 'eat_berry', fxColor: '#a0522d', hunger: 18, thirst: 6 },
  { kind: 'cookedFish', name: '烤鱼', icon: '🍢', action: 'eat_fish', fxColor: '#d99a4e', hunger: 40, thirst: 0 },
  { kind: 'cookedCrabMeat', name: '烤蟹肉', icon: '🍤', action: 'eat_fish', fxColor: '#e8703a', hunger: 28, thirst: 0 },
  { kind: 'cookedBirdMeat', name: '烤鸟肉', icon: '🍗', action: 'eat_fish', fxColor: '#b5722f', hunger: 35, thirst: 0 },
  { kind: 'cookedGameMeat', name: '烤兽肉', icon: '🥩', action: 'eat_fish', fxColor: '#9c4a2f', hunger: 42, thirst: 0 },
];

/** 烹饪映射:生食在燃烧的火堆上烤成熟食,效果增强;不可烤的食材不在表中 */
export const COOKABLE: Partial<Record<ResourceKind, ResourceKind>> = {
  berry: 'cookedBerry',
  sardine: 'cookedFish',
  shrimp: 'cookedFish',
  loach: 'cookedFish',
  perch: 'cookedFish',
  puffer: 'cookedFish',
  cuttlefish: 'cookedFish',
  grouper: 'cookedFish',
  catfish: 'cookedFish',
  swordfish: 'cookedFish',
  manta: 'cookedFish',
  crabMeat: 'cookedCrabMeat',
  birdMeat: 'cookedBirdMeat',
  gameMeat: 'cookedGameMeat',
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
