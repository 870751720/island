import type { HudSnapshot } from '@/game/GameContracts';
import type { CraftId } from '@/game/systems/Crafting';
import { gameTheme } from './gameTheme';
export function questRecipePriority(hud: HudSnapshot, id: CraftId): number {
  const q = hud.quests;
  if (!q?.enabled || q.finished) return 0;
  const index = q.recipes.indexOf(id);
  return index < 0 ? 0 : 100 - index;
}
export const questRecipeStyle = { outline: `2px solid ${gameTheme.accent}`, outlineOffset: -2, background: gameTheme.selected };
