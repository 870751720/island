import type { ResourceKind } from './Inventory';
import { HIDDEN_RECIPES, type HiddenFood, type HiddenRecipe } from './HiddenRecipeCatalog';
import { RESEARCH_INGREDIENTS, type ResearchIngredient } from './ResearchIngredients';

export { HIDDEN_RECIPES, type HiddenFood, type HiddenRecipe } from './HiddenRecipeCatalog';
export { RESEARCH_INGREDIENTS } from './ResearchIngredients';

const byKind = new Map<string, HiddenRecipe>(HIDDEN_RECIPES.map(r => [r.kind, r]));
const combinationKey = (kinds: readonly string[]) => [...kinds].sort().join('|');
const byCombination = new Map(HIDDEN_RECIPES.map(r => [combinationKey(r.research), r]));
const ingredientSet = new Set<string>(RESEARCH_INGREDIENTS);
export function hiddenRecipe(kind: string): HiddenRecipe | undefined { return byKind.get(kind); }
export function isHiddenFood(kind: string): kind is HiddenFood { return byKind.has(kind); }
export function matchResearch(kinds: readonly ResourceKind[]): HiddenRecipe | undefined {
  return new Set(kinds).size === kinds.length ? byCombination.get(combinationKey(kinds)) : undefined;
}
export function cookingCost(kind: ResourceKind): Partial<Record<ResourceKind, number>> {
  return hiddenRecipe(kind)?.cost ?? { [kind]: 1 };
}
export function validResearch(kinds: unknown): kinds is ResearchIngredient[] {
  return Array.isArray(kinds) && kinds.length >= 1 && kinds.length <= 4 && new Set(kinds).size === kinds.length
    && kinds.every(k => typeof k === 'string' && ingredientSet.has(k));
}
