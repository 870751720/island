import { hiddenRecipe, type HiddenFood } from '../systems/HiddenRecipes';

const KEY = 'island.recipe-discoveries.v1';
const found = new Set<HiddenFood>();
const listeners = new Set<() => void>();
let revision = 0;
function read(): void {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (Array.isArray(value)) for (const kind of value) {
      const recipe = typeof kind === 'string' ? hiddenRecipe(kind) : undefined;
      if (recipe) found.add(recipe.kind);
    }
  } catch { /* 存储不可用时保留本次运行的收藏。 */ }
}
export function loadRecipeDiscoveries(): HiddenFood[] { read(); return [...found]; }
export function hasRecipeDiscovery(kind: string): boolean { read(); return found.has(kind as HiddenFood); }
export function rememberRecipes(kinds: readonly string[]): void {
  read();
  let changed = false;
  for (const kind of kinds) {
    const recipe = hiddenRecipe(kind);
    if (recipe && !found.has(recipe.kind)) { found.add(recipe.kind); changed = true; }
  }
  if (!changed) return;
  try { localStorage.setItem(KEY, JSON.stringify([...found])); } catch { /* 内存收藏仍然有效。 */ }
  revision++;
  for (const listener of listeners) listener();
}
export function subscribeRecipes(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function recipeRevision(): number { return revision; }
