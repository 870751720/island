import type { HiddenRecipe } from './HiddenRecipeCatalog';
import type { ResearchIngredient } from './ResearchIngredients';

const INGREDIENT_COLORS: Partial<Record<ResearchIngredient, string>> = {
  berry: '#b76b89', strawberry: '#d9747c', fruitFruit: '#d49b61',
  pumpkin: '#e5a454', carrot: '#df9555', corn: '#edc562',
  potato: '#e9cd95', sweetPotato: '#c7867b', soybean: '#dfc791',
  pineFruit: '#c4a078', oakFruit: '#b79565', cabbage: '#9dbe86',
  tomato: '#dc8269', pepper: '#c96654', eggplant: '#977695',
  gameMeat: '#af755b', birdMeat: '#d29a6f', crabMeat: '#e2a085',
  shrimp: '#e9aa90', cuttlefish: '#a18b9b', sardine: '#93b4b9',
  perch: '#a3b28c', grouper: '#a59e7b', yellowCroaker: '#e2ba68',
};

export function hiddenIngredientColor(kind: ResearchIngredient): string {
  return INGREDIENT_COLORS[kind] ?? '#efe0bb';
}

/** 主料靠前，最多三种装饰；不把面粉或奶画成生料堆在成品上。 */
export function hiddenFoodGarnishes(recipe: HiddenRecipe): ResearchIngredient[] {
  return [...new Set([recipe.visual.garnish, ...recipe.research])]
    .filter(k => k !== 'flour' && k !== 'milk' && k !== 'cowMilk').slice(0, 3);
}
