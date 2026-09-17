import { FOODS, type FoodEater } from './Food';
import type { ResourceKind } from './Inventory';
import type { Vector3 } from 'three';

export const FOOD_EATER_LABELS: Record<FoodEater, string> = { rabbit: '兔子', sheep: '羊', bison: '野牛', wolf: '狼', bear: '熊', dog: '薯条' };

const foods = new Map(FOODS.map(food => [food.kind, food]));
export function animalFood(kind: ResourceKind, eater: FoodEater) {
  const food = foods.get(kind);
  return food && food.hunger > 0 && food.eaters.includes(eater) ? food : undefined;
}
export function isAnimalFood(kind: ResourceKind): boolean {
  const food = foods.get(kind);
  return !!food && food.hunger > 0 && food.eaters.length > 0;
}
export type FoodTarget = { position: Vector3; consume: () => number };
export interface AnimalFoodSource {
  foodTargets(eater: FoodEater, origin: Vector3, range: number): FoodTarget[];
}
