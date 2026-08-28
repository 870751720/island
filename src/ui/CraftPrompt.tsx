'use client';

import type { HudSnapshot } from '@/game/Game';
import { RECIPES, hasCost, type Recipe } from '@/game/systems/Crafting';

/** 材料齐且尚未拥有时,在工具按钮上方弹出的手搓合成卡片 */
export function CraftPrompt({ hud, onCraft }: { hud: HudSnapshot; onCraft: (id: Recipe['id']) => void }) {
  const craftable = RECIPES.filter((r) => !hud[r.id] && hasCost(r.cost, hud));
  if (craftable.length === 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        right: 20,
        bottom: 128,
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
          style={{
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
          }}
        >
          <span style={{ fontSize: 26 }}>{recipe.icon}</span>
          <span>
            手搓{recipe.name}
            <br />
            <span style={{ fontSize: 12, color: '#888' }}>
              {Object.entries(recipe.cost)
                .map(([k, n]) => `${n}${k === 'wood' ? '木' : '碎'}`)
                .join(' ')}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
