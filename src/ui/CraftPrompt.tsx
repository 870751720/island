'use client';

import type { CSSProperties } from 'react';
import type { HudSnapshot } from '@/game/Game';
import { RECIPES, WORKBENCH_COST, hasCost, type Recipe } from '@/game/systems/Crafting';

const UNIT_LABELS: Record<string, string> = {
  wood: '木',
  gravel: '碎',
  stone: '石',
  berry: '果',
  fiber: '纤',
  rope: '线',
};

/** 材料齐且尚未拥有时,在工具按钮上方弹出的手搓合成卡片(工具 + 工作台) */
export function CraftPrompt({
  hud,
  onCraft,
  onCraftWorkbench,
}: {
  hud: HudSnapshot;
  onCraft: (id: Recipe['id']) => void;
  onCraftWorkbench: () => void;
}) {
  // 任一合成进行中时不再展示卡片
  if (hud.craftId !== null || hud.workbenchCrafting) return null;
  const craftable = RECIPES.filter(
    (r) => (r.output || !hud[r.id as keyof HudSnapshot]) && hasCost(r.cost, hud)
  );
  const showWorkbench = hud.canCraftWorkbench;
  if (craftable.length === 0 && !showWorkbench) return null;
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
    </div>
  );
}

function costLabel(cost: Record<string, number | undefined>): string {
  return Object.entries(cost)
    .filter(([, n]) => !!n)
    .map(([k, n]) => `${n}${UNIT_LABELS[k] ?? k}`)
    .join(' ');
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
