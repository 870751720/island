import { FOODS, type Food } from './Food';
import type { ResourceKind } from './Inventory';

export const DOG_FOODS = FOODS.filter(food => food.eaters.includes('dog'));
const foods = new Map(DOG_FOODS.map(food => [food.kind, food]));

export function dogFood(kind: ResourceKind): Food | undefined { return foods.get(kind); }
