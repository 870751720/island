'use client';

import { ItemIcon } from './ItemIcon';
import { useEffect, useState } from 'react';
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

/** 火堆面板:添加可燃物延长燃烧,或在燃烧的火堆上选份数烤熟生食(效果增强) */
export function CampfirePanel({
  hud,
  onAddFuel,
  onCook,
  onClose,
}: {
  hud: HudSnapshot;
  onAddFuel: (kind: ResourceKind) => void;
  onCook: (kind: ResourceKind, count: number) => void;
  onClose: () => void;
}) {
  const count = countOf(hud);
  const [cookCounts, setCookCounts] = useState<Record<string, number>>({});
  const info = hud.campfireInfo;

  // 背包里可投入火堆的可燃物
  const burnables = (Object.keys(ITEMS) as ResourceKind[]).filter(
    (kind) => ITEMS[kind].burnTime && count(kind) > 0
  );
  // 背包里可烤的生食
  const cookables = FOODS.filter((f) => COOKABLE[f.kind] && count(f.kind) > 0);

  // 食材数量变化后把选份数收回上限,且默认选满
  const stockKey = cookables.map((f) => count(f.kind)).join(',');
  useEffect(() => {
    setCookCounts((prev) => {
      const next = { ...prev };
      for (const f of cookables) {
        const max = count(f.kind);
        next[f.kind] = Math.min(prev[f.kind] ?? 1, max);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockKey]);

  // 走开后面板由外层收起,这里兜底不渲染
  if (!info) return null;
  const lit = info.lit;

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
            : '火已经熄了,添柴可以重新点燃,也可以用锄头挖掉'}
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
              <ItemIcon kind={kind} size={20} /> {ITEMS[kind].name} ×{count(kind)}
              <span style={{ fontSize: 11, color: '#999' }}>+{ITEMS[kind].burnTime}秒</span>
            </button>
          ))}
        </div>

        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>烹饪</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cookables.length === 0 && (
            <span style={{ fontSize: 13, color: '#999' }}>背包里没有能烤的食材</span>
          )}
          {cookables.map((food) => {
            const cooked = ITEMS[COOKABLE[food.kind]!];
            const max = count(food.kind);
            const n = Math.min(cookCounts[food.kind] ?? 1, max);
            return (
              <div key={food.kind} style={rowStyle}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14 }}>
                    <ItemIcon kind={food.kind} size={18} /> {food.name} ×{max}
                  </div>
                  <div style={{ fontSize: 11, color: '#e0862e' }}>
                    → <ItemIcon kind={cooked.kind} size={18} /> {cooked.name}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    style={stepButtonStyle}
                    disabled={n <= 1}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setCookCounts((c) => ({ ...c, [food.kind]: Math.max(1, n - 1) }));
                    }}
                  >
                    −
                  </button>
                  <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 700 }}>{n}</span>
                  <button
                    style={stepButtonStyle}
                    disabled={n >= max}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setCookCounts((c) => ({ ...c, [food.kind]: Math.min(max, n + 1) }));
                    }}
                  >
                    +
                  </button>
                </div>
                <button
                  disabled={!lit}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onCook(food.kind, n);
                  }}
                  style={{ ...cookButtonStyle, opacity: lit ? 1 : 0.45 }}
                >
                  烤
                </button>
              </div>
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

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 10px',
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.08)',
  background: '#fff',
  touchAction: 'none',
  userSelect: 'none',
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

const cookButtonStyle: CSSProperties = {
  padding: '8px 14px',
  borderRadius: 10,
  border: 'none',
  background: '#e0862e',
  color: '#fff',
  fontWeight: 700,
  fontSize: 14,
  touchAction: 'none',
  userSelect: 'none',
};
