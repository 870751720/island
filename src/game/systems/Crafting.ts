import type { ResourceKind, Inventory } from './Inventory';

export type Tools = {
  axe: boolean;
  pickaxe: boolean;
};

export type Recipe = {
  id: keyof Tools;
  name: string;
  icon: string;
  cost: Partial<Record<ResourceKind, number>>;
};

export const RECIPES: Recipe[] = [
  { id: 'axe', name: '斧子', icon: '🪓', cost: { wood: 2, gravel: 2 } },
  { id: 'pickaxe', name: '镐子', icon: '⛏️', cost: { wood: 2, gravel: 3 } },
];

/** 按资源数量表判断材料是否足够(背包与 HUD 快照均可传入) */
export function hasCost(cost: Recipe['cost'], counts: Partial<Record<ResourceKind, number>>): boolean {
  return Object.entries(cost).every(
    ([kind, n]) => (counts[kind as ResourceKind] ?? 0) >= (n ?? 0)
  );
}

export function canCraft(recipe: Recipe, inventory: Inventory): boolean {
  return hasCost(recipe.cost, inventory.state);
}

export function craft(recipe: Recipe, inventory: Inventory, tools: Tools): boolean {
  if (tools[recipe.id] || !canCraft(recipe, inventory)) return false;
  for (const [kind, n] of Object.entries(recipe.cost)) {
    inventory.remove(kind as ResourceKind, n ?? 0);
  }
  tools[recipe.id] = true;
  return true;
}
