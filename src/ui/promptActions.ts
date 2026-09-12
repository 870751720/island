import type { HudSnapshot } from '@/game/GameContracts';
import { countsFromSlots } from '@/game/systems/Inventory';
import {
  RECIPES,
  countsWithEquipped,
  hasCost,
  recipeVisible,
  type Recipe,
} from '@/game/systems/Crafting';
import { getPromptVisibility } from './promptVisibility';

/** 当前屏幕上应显示的那张提示卡(捡回 > 进食 > 手搓),卡片渲染与桌面 F/G 键共用同一判定 */
export type PromptCard =
  | { card: 'drop' }
  | { card: 'eat' }
  | { card: 'craft'; recipe: Recipe };

/** 手搓卡片当前应弹出的最高优先级配方(材料齐 + 未拥有 + 可见;移动/合成进行中由调用方判断) */
export function topHandRecipe(hud: HudSnapshot): Recipe | null {
  const ownedTools = hud.toolTiers;
  const counts = countsWithEquipped(countsFromSlots(hud.slots), hud.equipped);
  const candidates = RECIPES.filter(
    (r) =>
      r.station === 'hand' &&
      !r.hidePrompt &&
      (!r.tool || !ownedTools[r.tool]) &&
      hasCost(r.cost, counts) &&
      recipeVisible(r, counts, ownedTools, hud.equipped, hud.slots, {
        workbenchPlaced: hud.workbenchCrafted,
        campfirePlaced: hud.campfirePlaced,
      })
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) =>
    (b.promptPriority ?? Number.MAX_SAFE_INTEGER) < (a.promptPriority ?? Number.MAX_SAFE_INTEGER) ? b : a
  );
}

/** 按「捡回 > 进食 > 手搓」的互斥优先级给出当前唯一可见的提示卡;无卡可弹时返回 null */
export function currentPromptCard(hud: HudSnapshot, backpackOpen: boolean): PromptCard | null {
  if (hud.dead) return null;
  const { dropActive, eatActive } = getPromptVisibility(hud, backpackOpen);
  if (dropActive) return { card: 'drop' };
  if (eatActive) return { card: 'eat' };
  if (hud.moving || hud.craftId !== null) return null;
  const recipe = topHandRecipe(hud);
  return recipe ? { card: 'craft', recipe } : null;
}
