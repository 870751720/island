import type { ActionType } from '../entities/Player';
import type { ResourceKind } from './Inventory';

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

/** 进食顺序:越靠前越先被吃(「背包里最前面的食物」) */
export const FOODS: Food[] = [
  { kind: 'berry', name: '浆果', icon: '🍒', action: 'eat_berry', fxColor: '#c0392b', hunger: 12, thirst: 4 },
  { kind: 'fish', name: '生鱼', icon: '🐟', action: 'eat_fish', fxColor: '#5fa8d3', hunger: 25, thirst: 0 },
  { kind: 'crabMeat', name: '蟹肉', icon: '🦀', action: 'eat_fish', fxColor: '#e2793a', hunger: 15, thirst: 0 },
  { kind: 'birdMeat', name: '鸟肉', icon: '🐦', action: 'eat_fish', fxColor: '#c98a5a', hunger: 18, thirst: 0 },
  { kind: 'cookedBerry', name: '烤浆果', icon: '🍬', action: 'eat_berry', fxColor: '#a0522d', hunger: 18, thirst: 6 },
  { kind: 'cookedFish', name: '烤鱼', icon: '🍢', action: 'eat_fish', fxColor: '#d99a4e', hunger: 40, thirst: 0 },
  { kind: 'cookedCrabMeat', name: '烤蟹肉', icon: '🍤', action: 'eat_fish', fxColor: '#e8703a', hunger: 28, thirst: 0 },
  { kind: 'cookedBirdMeat', name: '烤鸟肉', icon: '🍗', action: 'eat_fish', fxColor: '#b5722f', hunger: 35, thirst: 0 },
];

/** 烹饪映射:生食在燃烧的火堆上烤成熟食,效果增强;不可烤的食材不在表中 */
export const COOKABLE: Partial<Record<ResourceKind, ResourceKind>> = {
  berry: 'cookedBerry',
  fish: 'cookedFish',
  crabMeat: 'cookedCrabMeat',
  birdMeat: 'cookedBirdMeat',
};
