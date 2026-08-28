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
];
