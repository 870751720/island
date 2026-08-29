'use client';

import type { CSSProperties } from 'react';
import { RECIPES, type Recipe } from '@/game/systems/Crafting';
import { ITEMS } from '@/game/systems/Items';
import { EQUIPMENT, isEquipKind } from '@/game/systems/Equipment';
import { costLabel } from './materials';

const STATION_NAMES: Record<Recipe['station'], string> = {
  hand: '手搓',
  workbench: '工作台',
};

/** 单条配方的产物说明:装备评分/背包扩容,其他道具用道具描述首句 */
function effectText(recipe: Recipe): string | null {
  if (recipe.output && isEquipKind(recipe.output)) {
    const def = EQUIPMENT[recipe.output];
    const parts = [`装备评分 ${def.score}`];
    if (def.capacity) parts.push(`背包 ${def.capacity} 格`);
    return parts.join(' · ');
  }
  if (recipe.output) {
    const desc = ITEMS[recipe.output].description;
    return desc.split('。')[0] + '。';
  }
  return null;
}

/** 合成图鉴:列出全部配方(产物、材料、站点与效果),随时可查,不判断材料够不够 */
export function RecipeBook({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={overlayStyle}
      onPointerDown={(e) => {
        e.preventDefault();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={panelStyle}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 10 }}>📖 合成图鉴</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {RECIPES.map((r) => (
            <div key={r.id} style={rowStyle}>
              <span style={{ fontSize: 26 }}>{r.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{r.name}</span>
                  <span style={tagStyle}>{STATION_NAMES[r.station]}</span>
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  {costLabel(r.cost, ' + ')}
                </div>
                {effectText(r) && (
                  <div style={{ fontSize: 12, color: '#999' }}>{effectText(r)}</div>
                )}
              </div>
            </div>
          ))}
        </div>
        <button style={closeButtonStyle} onPointerDown={(e) => { e.preventDefault(); onClose(); }}>
          关闭
        </button>
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 70,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.35)',
};

const panelStyle: CSSProperties = {
  width: 'min(92vw, 400px)',
  maxHeight: '80vh',
  overflowY: 'auto',
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

const tagStyle: CSSProperties = {
  padding: '1px 8px',
  borderRadius: 6,
  background: 'rgba(0,0,0,0.08)',
  color: '#777',
  fontSize: 11,
};

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
