import type { ResourceKind } from './Inventory';

export type HiddenFood = 'strawberryCake' | 'applePie' | 'meatPie';
export type HiddenRecipe = {
  kind: HiddenFood;
  research: readonly ResourceKind[];
  cost: Partial<Record<ResourceKind, number>>;
  clue: string;
  hint: string;
};
export const HIDDEN_RECIPES: readonly HiddenRecipe[] = [
  { kind: 'strawberryCake', research: ['flour', 'strawberry', 'milk'], cost: { flour: 2, strawberry: 2, milk: 1 }, clue: '柔软的面点里，藏着红色小果和羊奶的香气。', hint: '试试面粉、草莓和羊奶，各一份。' },
  { kind: 'applePie', research: ['flour', 'fruitFruit'], cost: { flour: 2, fruitFruit: 3 }, clue: '树上摘下的脆甜果实，也许能成为面皮里的馅。', hint: '试试面粉和苹果，各一份。' },
  { kind: 'meatPie', research: ['flour', 'gameMeat', 'carrot', 'pepper'], cost: { flour: 2, gameMeat: 2, carrot: 1, pepper: 1 }, clue: '面皮裹住兽肉，加一点橙色菜根和辣味，会怎样？', hint: '试试面粉、兽肉、胡萝卜和辣椒，各一份。' },
];
export const RESEARCH_INGREDIENTS: readonly ResourceKind[] = ['flour', 'berry', 'fruitFruit', 'milk', 'cowMilk', 'carrot', 'potato', 'sweetPotato', 'corn', 'soybean', 'tomato', 'pepper', 'eggplant', 'strawberry', 'cabbage', 'pumpkin', 'gameMeat', 'birdMeat', 'crabMeat', 'sardine', 'shrimp', 'perch', 'loach', 'puffer', 'cuttlefish', 'anchovy', 'horseMackerel', 'yellowCroaker', 'saury', 'hairtail', 'grouper', 'catfish', 'grassCarp', 'swordfish', 'manta', 'goldenFish', 'oakFruit', 'pineFruit'];
export function hiddenRecipe(kind: string): HiddenRecipe | undefined { return HIDDEN_RECIPES.find(r => r.kind === kind); }
export function matchResearch(kinds: readonly ResourceKind[]): HiddenRecipe | undefined {
  return HIDDEN_RECIPES.find(r => r.research.length === kinds.length && new Set(kinds).size === kinds.length && r.research.every(k => kinds.includes(k)));
}
export function cookingCost(kind: ResourceKind): Partial<Record<ResourceKind, number>> { return hiddenRecipe(kind)?.cost ?? { [kind]: 1 }; }
export function validResearch(kinds: unknown): kinds is ResourceKind[] {
  return Array.isArray(kinds) && kinds.length >= 1 && kinds.length <= 4 && new Set(kinds).size === kinds.length && kinds.every(k => RESEARCH_INGREDIENTS.includes(k));
}
