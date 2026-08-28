'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { HudSnapshot } from '@/game/Game';
import {
  RECIPES,
  maxCraftCount,
  type CraftId,
  type Recipe,
} from '@/game/systems/Crafting';

const UNIT_LABELS: Record<string, string> = {
  wood: '木',
  gravel: '碎',
  stone: '石',
  berry: '果',
  fiber: '纤',
  rope: '线',
};

function costLabel(cost: Recipe['cost']): string {
  return Object.entries(cost)
    .filter(([, n]) => !!n)
    .map(([k, n]) => `${n}${UNIT_LABELS[k] ?? k}`)
    .join(' ');
}

/** 工作台制作面板:列出所有工作台配方,可调数量,确认后关闭面板并开始排队制作 */
export function WorkbenchPanel({
  hud,
  onCraft,
  onClose,
}: {
  hud: HudSnapshot;
  onCraft: (id: CraftId, count: number) => void;
  onClose: () => void;
}) {
  const recipes = RECIPES.filter((r) => r.station === 'workbench');
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(recipes.map((r) => [r.id, 1]))
  );

  // 材料变化后把超出可制作上限的数量收回来
  useEffect(() => {
    setCounts((prev) => {
      const next = { ...prev };
      for (const r of recipes) {
        const max = maxCount(r, hud);
        if ((next[r.id] ?? 1) > max) next[r.id] = max;
      }
      return next;
    });
  }, [hud.wood, hud.gravel, hud.fiber, hud.rope, hud.fishingrod]);

  return (
    <div
      style={overlayStyle}
      onPointerDown={(e) => {
        e.preventDefault();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={panelStyle}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 10 }}>🛠️ 工作台</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recipes.map((r) => {
            const max = maxCount(r, hud);
            const count = Math.min(counts[r.id] ?? 1, max);
            return (
              <div key={r.id} style={rowStyle}>
                <span style={{ fontSize: 26 }}>{r.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div>{r.name}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {costLabel(r.cost)}
                    {r.output && count > 1 ? ` ×${count}` : ''}
                  </div>
                </div>
                {r.output && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      style={stepButtonStyle}
                      disabled={count <= 1}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        setCounts((c) => ({ ...c, [r.id]: Math.max(1, count - 1) }));
                      }}
                    >
                      −
                    </button>
                    <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 700 }}>
                      {count}
                    </span>
                    <button
                      style={stepButtonStyle}
                      disabled={count >= max}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        setCounts((c) => ({ ...c, [r.id]: Math.min(max, count + 1) }));
                      }}
                    >
                      +
                    </button>
                  </div>
                )}
                <button
                  style={craftButtonStyle(max > 0)}
                  disabled={max === 0}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (max > 0) onCraft(r.id, Math.max(1, count));
                  }}
                >
                  {max === 0 ? (r.tool && hud[r.tool] ? '已拥有' : '材料不足') : '制作'}
                </button>
              </div>
            );
          })}
        </div>
        <button style={closeButtonStyle} onPointerDown={(e) => { e.preventDefault(); onClose(); }}>
          关闭
        </button>
      </div>
    </div>
  );
}

function maxCount(recipe: Recipe, hud: HudSnapshot): number {
  return maxCraftCount(recipe, hud, {
    axe: hud.axe,
    pickaxe: hud.pickaxe,
    fishingrod: hud.fishingrod,
  });
}

const overlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 60,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.35)',
};

const panelStyle: CSSProperties = {
  width: 'min(92vw, 400px)',
  padding: '16px 14px',
  background: 'rgba(255,255,255,0.95)',
  borderRadius: 14,
  fontFamily: 'sans-serif',
  fontSize: 15,
  color: '#333',
  boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 10px',
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.08)',
  background: 'rgba(255,255,255,0.8)',
};

const stepButtonStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(0,0,0,0.08)',
  fontSize: 20,
  lineHeight: 1,
  touchAction: 'none',
  userSelect: 'none',
};

const craftButtonStyle = (enabled: boolean): CSSProperties => ({
  padding: '8px 14px',
  borderRadius: 10,
  border: 'none',
  background: enabled ? '#4caf50' : '#bbb',
  color: '#fff',
  fontWeight: 700,
  fontSize: 14,
  touchAction: 'none',
  userSelect: 'none',
});

const closeButtonStyle: CSSProperties = {
  width: '100%',
  marginTop: 12,
  padding: '10px 0',
  borderRadius: 10,
  border: 'none',
  background: 'rgba(0,0,0,0.1)',
  fontSize: 15,
  touchAction: 'none',
  userSelect: 'none',
};
