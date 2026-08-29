'use client';

import type { CSSProperties } from 'react';
import type { HudSnapshot } from '@/game/Game';
import { ITEMS } from '@/game/systems/Items';
import { FOODS, COOKABLE } from '@/game/systems/Food';
import type { ResourceKind } from '@/game/systems/Inventory';

/** 统计背包快照里各道具的数量 */
function countOf(hud: HudSnapshot): (kind: ResourceKind) => number {
  return (kind) =>
    hud.slots.reduce((n, slot) => (slot && slot.kind === kind ? n + slot.count : n), 0);
}

/** 火堆面板:添加可燃物延长燃烧,或在燃烧的火堆上把生食烤熟(效果增强) */
export function CampfirePanel({
  hud,
  onAddFuel,
  onCook,
  onClose,
}: {
  hud: HudSnapshot;
  onAddFuel: (kind: ResourceKind) => void;
  onCook: (kind: ResourceKind) => void;
  onClose: () => void;
}) {
  const count = countOf(hud);
  const info = hud.campfireInfo;
  // 走开后面板由外层收起,这里兜底不渲染
  if (!info) return null;
  const lit = info.lit;

  // 背包里可投入火堆的可燃物
  const burnables = (Object.keys(ITEMS) as ResourceKind[]).filter(
    (kind) => ITEMS[kind].burnTime && count(kind) > 0
  );
  // 背包里可烤的生食
  const cookables = FOODS.filter((f) => COOKABLE[f.kind] && count(f.kind) > 0);

  return (
    <div
      style={overlayStyle}
      onPointerDown={(e) => {
        e.preventDefault();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={panelStyle}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>🔥 火堆</div>
        <div style={{ fontSize: 13, color: lit ? '#e0862e' : '#999', marginBottom: 12 }}>
          {lit
            ? `燃烧中 · 剩余约 ${Math.ceil(info.fuel)} 秒,添柴或烤点吃的吧`
            : '火已经熄了,只剩灰烬……'}
        </div>

        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>添柴</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {burnables.length === 0 && (
            <span style={{ fontSize: 13, color: '#999' }}>背包里没有能烧的东西</span>
          )}
          {burnables.map((kind) => (
            <button
              key={kind}
              onPointerDown={(e) => {
                e.preventDefault();
                onAddFuel(kind);
              }}
              style={chipStyle}
            >
              {ITEMS[kind].icon} {ITEMS[kind].name} ×{count(kind)}
              <span style={{ fontSize: 11, color: '#999' }}>+{ITEMS[kind].burnTime}秒</span>
            </button>
          ))}
        </div>

        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>烹饪</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {cookables.length === 0 && (
            <span style={{ fontSize: 13, color: '#999' }}>背包里没有能烤的食材</span>
          )}
          {cookables.map((food) => {
            const cooked = ITEMS[COOKABLE[food.kind]!];
            return (
              <button
                key={food.kind}
                disabled={!lit}
                onPointerDown={(e) => {
                  e.preventDefault();
                  onCook(food.kind);
                }}
                style={{ ...chipStyle, opacity: lit ? 1 : 0.45 }}
              >
                {food.icon} {food.name} ×{count(food.kind)}
                <span style={{ fontSize: 11, color: '#e0862e' }}>→ {cooked.icon} {cooked.name}</span>
              </button>
            );
          })}
        </div>

        <button
          onPointerDown={(e) => {
            e.preventDefault();
            onClose();
          }}
          style={{ ...chipStyle, marginTop: 16, width: '100%', justifyContent: 'center' }}
        >
          关闭
        </button>
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.35)',
  touchAction: 'none',
  zIndex: 30,
};

const panelStyle: CSSProperties = {
  width: 'min(320px, calc(100vw - 48px))',
  maxHeight: '80dvh',
  overflowY: 'auto',
  padding: '18px 20px',
  borderRadius: 18,
  background: 'rgba(255,251,242,0.96)',
  color: '#333',
  fontFamily: 'sans-serif',
  boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
};

const chipStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 12px',
  borderRadius: 12,
  border: '2px solid #e0a066',
  background: '#fff',
  color: '#333',
  fontSize: 14,
  textAlign: 'left',
  touchAction: 'none',
  userSelect: 'none',
};
