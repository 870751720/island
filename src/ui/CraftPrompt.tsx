'use client';

import { ItemIcon } from './ItemIcon';
import type { ReactNode } from 'react';
import type { HudSnapshot } from '@/game/Game';
import { countsFromSlots } from '@/game/systems/Inventory';
import {
  RECIPES,
  countsWithEquipped,
  WORKBENCH_PROMPT_PRIORITY,
  hasCost,
  recipeIconKind,
  recipeIconLevel,
  recipeVisible,
  type Recipe,
} from '@/game/systems/Crafting';
import { CAMPFIRE_PROMPT_PRIORITY } from '@/game/systems/CampfireSystem';
import { promptCardStyle, promptWrapStyle } from './promptCard';

/** 手搓卡片的一个候选(配方 / 工作台 / 火堆) */
type PromptCard = {
  priority: number;
  icon: ReactNode;
  title: string;
  onCraft: () => void;
};

/** 材料齐且尚未拥有时弹出的合成卡片;同一时刻只显示优先级最高的一张(移动中不显示,捡回/进食卡片出现时让位;不列材料,卡片更小) */
export function CraftPrompt({
  hud,
  onCraft,
  onCraftWorkbench,
  onCraftCampfire,
  suppressed,
}: {
  hud: HudSnapshot;
  onCraft: (id: Recipe['id']) => void;
  onCraftWorkbench: () => void;
  onCraftCampfire: () => void;
  suppressed: boolean;
}) {
  // 任一合成进行中时不再展示卡片;工作台配方不在手搓卡片中出现
  if (suppressed || hud.moving || hud.craftId !== null || hud.workbenchCrafting || hud.campfireCrafting)
    return null;
  const ownedTools = hud.toolTiers;
  const counts = countsWithEquipped(countsFromSlots(hud.slots), hud.equipped);
  const cards: PromptCard[] = RECIPES.filter(
    (r) =>
      r.station === 'hand' &&
      !r.hidePrompt &&
      (!r.tool || !ownedTools[r.tool]) &&
      hasCost(r.cost, counts) &&
      recipeVisible(r, counts, ownedTools, hud.equipped, hud.slots)
  ).map((r) => ({
    priority: r.promptPriority ?? Number.MAX_SAFE_INTEGER,
    icon: <ItemIcon kind={recipeIconKind(r)} level={recipeIconLevel(r)} size={26} />,
    title: `制作${r.name}`,
    onCraft: () => onCraft(r.id),
  }));
  if (hud.canCraftWorkbench) {
    cards.push({
      priority: WORKBENCH_PROMPT_PRIORITY,
      icon: <span style={{ fontSize: 26 }}>🛠️</span>,
      title: '制作工作台',
      onCraft: onCraftWorkbench,
    });
  }
  if (hud.canCraftCampfire) {
    cards.push({
      priority: CAMPFIRE_PROMPT_PRIORITY,
      icon: <span style={{ fontSize: 26 }}>🔥</span>,
      title: '原地搭小火堆',
      onCraft: onCraftCampfire,
    });
  }
  if (cards.length === 0) return null;
  const best = cards.reduce((a, b) => (b.priority < a.priority ? b : a));
  return (
    <div style={promptWrapStyle(hud)}>
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          best.onCraft();
        }}
        style={{ ...promptCardStyle, minWidth: 0, minHeight: 44, padding: '6px 14px' }}
      >
        {best.icon}
        <span>{best.title}</span>
      </button>
    </div>
  );
}
