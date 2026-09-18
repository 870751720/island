import { FOODS, type FoodEater } from './Food';
import type { ResourceKind } from './Inventory';
import type { Vector3 } from 'three';
import { husbandryFoodHeart } from './HusbandryFood';

export const FOOD_EATER_LABELS: Record<FoodEater, string> = { rabbit: '兔子', sheep: '羊', bison: '野牛', wolf: '狼', bear: '熊', dog: '薯条', cat: '可乐' };

const foods = new Map(FOODS.map(food => [food.kind, food]));
export function animalFood(kind: ResourceKind, eater: FoodEater) {
  const food = foods.get(kind);
  return food && food.hunger > 0 && food.eaters.includes(eater) ? food : undefined;
}
export function isAnimalFood(kind: ResourceKind): boolean {
  const food = foods.get(kind);
  return !!food && food.hunger > 0 && food.eaters.length > 0;
}
export function animalFoodHeart(kind: ResourceKind, eater: FoodEater, tamed = false): number {
  const food = animalFood(kind, eater);
  if (!food) return 0;
  return tamed && eater !== 'dog' && eater !== 'cat' ? husbandryFoodHeart(food) : food.hunger;
}
export type FoodTarget = { position: Vector3; consume: () => number };
export interface AnimalFoodSource {
  foodTargets(eater: FoodEater, origin: Vector3, range: number, tamed?: boolean): FoodTarget[];
}
