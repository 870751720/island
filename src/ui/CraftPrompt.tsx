'use client';

import { ItemIcon } from './ItemIcon';
import type { HudSnapshot } from '@/game/GameContracts';
import type { Recipe } from '@/game/systems/Crafting';
import { recipeIconKind, recipeIconLevel } from '@/game/systems/Crafting';
import { promptCardStyle, promptWrapStyle } from './promptCard';
import { topHandRecipe } from './promptActions';

/** 材料齐且尚未拥有时弹出的合成卡片;同一时刻只显示优先级最高的一张(移动中不显示,捡回/进食卡片出现时让位;不列材料,卡片更小) */
export function CraftPrompt({
  hud,
  onCraft,
  suppressed,
}: {
  hud: HudSnapshot;
  onCraft: (id: Recipe['id']) => void;
  suppressed: boolean;
}) {
  // 任一合成进行中时不再展示卡片;工作台配方不在手搓卡片中出现
  if (suppressed || hud.moving || hud.craftId !== null) return null;
  const best = topHandRecipe(hud);
  if (!best) return null;
  return (
    <div style={promptWrapStyle(hud)}>
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          onCraft(best.id);
        }}
        style={{ ...promptCardStyle, minWidth: 0, minHeight: 44, padding: '6px 14px' }}
      >
        <ItemIcon kind={recipeIconKind(best)} level={recipeIconLevel(best)} size={26} />
        <span>制作{best.name}</span>
      </button>
    </div>
  );
}
