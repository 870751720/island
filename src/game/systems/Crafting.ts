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

export function canCraft(recipe: Recipe, inventory: Inventory): boolean {
  return Object.entries(recipe.cost).every(
    ([kind, n]) => inventory.state[kind as ResourceKind] >= (n ?? 0)
  );
}

export function craft(recipe: Recipe, inventory: Inventory, tools: Tools): boolean {
  if (tools[recipe.id] || !canCraft(recipe, inventory)) return false;
  for (const [kind, n] of Object.entries(recipe.cost)) {
    inventory.remove(kind as ResourceKind, n ?? 0);
  }
  tools[recipe.id] = true;
  return true;
}
