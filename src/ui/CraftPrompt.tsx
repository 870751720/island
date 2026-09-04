'use client';

import { ItemIcon } from './ItemIcon';
import type { CSSProperties, ReactNode } from 'react';
import type { HudSnapshot } from '@/game/Game';
import {
  RECIPES,
  WORKBENCH_COST,
  WORKBENCH_PROMPT_PRIORITY,
  hasCost,
  recipeIconKind,
  recipeIconLevel,
  recipeVisible,
  type Recipe,
} from '@/game/systems/Crafting';
import { CAMPFIRE_COST, CAMPFIRE_PROMPT_PRIORITY } from '@/game/systems/CampfireSystem';
import { costLabel } from './materials';
import { fadeStyle } from './fade';

/** 手搓卡片的一个候选(配方 / 工作台 / 火堆) */
type PromptCard = {
  priority: number;
  icon: ReactNode;
  title: string;
  cost: Partial<Record<string, number>>;
  onCraft: () => void;
};

/** 材料齐且尚未拥有时,在工具按钮上方弹出的手搓合成卡片;同一时刻只显示优先级最高的一张 */
export function CraftPrompt({
  hud,
  onCraft,
  onCraftWorkbench,
  onCraftCampfire,
}: {
  hud: HudSnapshot;
  onCraft: (id: Recipe['id']) => void;
  onCraftWorkbench: () => void;
  onCraftCampfire: () => void;
}) {
  // 任一合成进行中时不再展示卡片;工作台配方不在手搓卡片中出现
  if (hud.craftId !== null || hud.workbenchCrafting || hud.campfireCrafting) return null;
  const ownedTools = hud.toolTiers;
  // 鱼饵配方:只在手持鱼竿且背包没有鱼饵时弹出
  const baitCrafting = hud.tool === 'fishingrod' && hud.bait <= 0;
  const cards: PromptCard[] = RECIPES.filter(
    (r) =>
      r.station === 'hand' &&
      !r.hidePrompt &&
      (!r.tool || !ownedTools[r.tool]) &&
      hasCost(r.cost, hud) &&
      (!r.baitPrompt || baitCrafting) &&
      recipeVisible(r, hud, ownedTools, hud.equipped, hud.slots)
  ).map((r) => ({
    priority: r.promptPriority ?? Number.MAX_SAFE_INTEGER,
    icon: <ItemIcon kind={recipeIconKind(r)} level={recipeIconLevel(r)} size={26} />,
    title: `手搓${r.name}`,
    cost: r.cost,
    onCraft: () => onCraft(r.id),
  }));
  if (hud.canCraftWorkbench) {
    cards.push({
      priority: WORKBENCH_PROMPT_PRIORITY,
      icon: <span style={{ fontSize: 26 }}>🛠️</span>,
      title: '手搓工作台',
      cost: WORKBENCH_COST,
      onCraft: onCraftWorkbench,
    });
  }
  if (hud.canCraftCampfire) {
    cards.push({
      priority: CAMPFIRE_PROMPT_PRIORITY,
      icon: <span style={{ fontSize: 26 }}>🔥</span>,
      title: '原地搭小火堆',
      cost: CAMPFIRE_COST,
      onCraft: onCraftCampfire,
    });
  }
  if (cards.length === 0) return null;
  const best = cards.reduce((a, b) => (b.priority < a.priority ? b : a));
  return (
    <div
      style={{
        position: 'absolute',
        left: 'max(12px, env(safe-area-inset-left))',
        top: '50%',
        transform: 'translateY(-50%)',
        fontFamily: 'sans-serif',
        ...fadeStyle(hud.busy),
      }}
    >
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          best.onCraft();
        }}
        style={cardStyle}
      >
        {best.icon}
        <span>
          {best.title}
          <br />
          <span style={{ fontSize: 12, color: '#888' }}>{costLabel(best.cost)}</span>
        </span>
      </button>
    </div>
  );
}

const cardStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 150,
  minHeight: 56,
  padding: '8px 16px',
  borderRadius: 14,
  border: '2px solid #4caf50',
  background: 'rgba(255,255,255,0.92)',
  color: '#333',
  fontSize: 15,
  textAlign: 'left',
  touchAction: 'none',
  userSelect: 'none',
  boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
};
