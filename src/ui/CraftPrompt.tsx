'use client';

import type { CSSProperties } from 'react';
import type { HudSnapshot } from '@/game/Game';
import { RECIPES, WORKBENCH_COST, hasCost, recipeVisible, type Recipe } from '@/game/systems/Crafting';
import { CAMPFIRE_COST } from '@/game/systems/CampfireSystem';
import { costLabel } from './materials';

/** 材料齐且尚未拥有时,在工具按钮上方弹出的手搓合成卡片(斧/镐 + 工作台) */
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
  const craftable = RECIPES.filter(
    (r) =>
      r.station === 'hand' &&
      (!r.tool || !ownedTools[r.tool]) &&
      hasCost(r.cost, hud) &&
      recipeVisible(r, hud, ownedTools, hud.equipped, hud.slots)
  );
  const showWorkbench = hud.canCraftWorkbench;
  const showCampfire = hud.canCraftCampfire;
  if (craftable.length === 0 && !showWorkbench && !showCampfire) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 'max(12px, env(safe-area-inset-left))',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontFamily: 'sans-serif',
      }}
    >
      {craftable.map((recipe) => (
        <button
          key={recipe.id}
          onPointerDown={(e) => {
            e.preventDefault();
            onCraft(recipe.id);
          }}
          style={cardStyle}
        >
          <span style={{ fontSize: 26 }}>{recipe.icon}</span>
          <span>
            手搓{recipe.name}
            <br />
            <span style={{ fontSize: 12, color: '#888' }}>{costLabel(recipe.cost)}</span>
          </span>
        </button>
      ))}
      {showWorkbench && (
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            onCraftWorkbench();
          }}
          style={cardStyle}
        >
          <span style={{ fontSize: 26 }}>🛠️</span>
          <span>
            手搓工作台
            <br />
            <span style={{ fontSize: 12, color: '#888' }}>
              {costLabel(WORKBENCH_COST)}
            </span>
          </span>
        </button>
      )}
      {showCampfire && (
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            onCraftCampfire();
          }}
          style={cardStyle}
        >
          <span style={{ fontSize: 26 }}>🔥</span>
          <span>
            原地搭小火堆
            <br />
            <span style={{ fontSize: 12, color: '#888' }}>
              {costLabel(CAMPFIRE_COST)}
            </span>
          </span>
        </button>
      )}
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
