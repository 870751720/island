import type { Food } from './Food';
import type { ResourceKind } from './Inventory';

/** 日常饲养独立于玩家饥饿值和首次驯养；统一按基础恢复量提高 20% 向上取整。 */
const boosted = (base: number): number => Math.ceil(base * 1.2);
const RAW_PLANT_BASE: Partial<Record<ResourceKind, number>> = {
  oakFruit: 5, berry: 15, fruitFruit: 15,
  soybean: 20, tomato: 21, eggplant: 21, potato: 22, strawberry: 22,
  sweetPotato: 23, corn: 23, cabbage: 23, carrot: 25, pumpkin: 25,
};

export const GRAZING_HEART = boosted(4);
export const BERRY_BUSH_HEART = boosted(15);

export function husbandryFoodHeart(food: Food): number {
  const plant = RAW_PLANT_BASE[food.kind];
  if (plant !== undefined) return boosted(plant);
  // 肉鱼保持品质差异，熟食和大鱼提供更长的照料间隔。
  if (food.eaters.includes('wolf')) return boosted(Math.max(25, food.hunger * 2));
  // 植物熟食基础恢复 30～40；烹饪方式及食材差异沿用原食物属性。
  return boosted(Math.min(40, Math.max(30, food.hunger + 22)));
}
