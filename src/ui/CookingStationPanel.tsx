'use client';

import { ItemIcon } from './ItemIcon';
import { StepButton } from './StepButton';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { HudSnapshot } from '@/game/Game';
import { ITEMS } from '@/game/systems/Items';
import { FOODS, COOKABLE, BOILABLE } from '@/game/systems/Food';
import type { ResourceKind } from '@/game/systems/Inventory';

/** 统计背包快照里各道具的数量 */
function countOf(hud: HudSnapshot): (kind: ResourceKind) => number {
  return (kind) =>
    hud.slots.reduce((n, slot) => (slot && slot.kind === kind ? n + slot.count : n), 0);
}

/** 烹饪台面板:添柴、烤制(与火堆相同)与煮汤(选一种食材和份数,每 5 秒煮好 1 份存放台上) */
export function CookingStationPanel({
  hud,
  onAddFuel,
  onRoast,
  onBoil,
  onCollect,
  onTakeBoil,
  onClose,
}: {
  hud: HudSnapshot;
  onAddFuel: (kind: ResourceKind) => void;
  onRoast: (kind: ResourceKind, count: number) => void;
  onBoil: (kind: ResourceKind, count: number) => void;
  onCollect: () => void;
  /** 取回锅里还没煮的食材 */
  onTakeBoil: () => void;
  onClose: () => void;
}) {
  const count = countOf(hud);
  const [roastCounts, setRoastCounts] = useState<Record<string, number>>({});
  const [boilCounts, setBoilCounts] = useState<Record<string, number>>({});
  const info = hud.cookingStationInfo;

  // 背包里可投入烹饪台的可燃物
  const burnables = (Object.keys(ITEMS) as ResourceKind[]).filter(
    (kind) => ITEMS[kind].burnTime && count(kind) > 0
  );
  // 背包里可烤/可煮的生食
  const roastables = FOODS.filter((f) => COOKABLE[f.kind] && count(f.kind) > 0);
  const boilables = FOODS.filter((f) => BOILABLE[f.kind] && count(f.kind) > 0);

  // 食材数量变化后把选份数收回上限,且默认选满
  const roastKey = roastables.map((f) => count(f.kind)).join(',');
  const boilKey = boilables.map((f) => count(f.kind)).join(',');
  useEffect(() => {
    setRoastCounts((prev) => {
      const next = { ...prev };
      for (const f of roastables) next[f.kind] = Math.min(prev[f.kind] ?? 1, count(f.kind));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roastKey]);
  useEffect(() => {
    setBoilCounts((prev) => {
      const next = { ...prev };
      for (const f of boilables) next[f.kind] = Math.min(prev[f.kind] ?? 1, count(f.kind));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boilKey]);

  // 走开后面板由外层收起,这里兜底不渲染
  if (!info) return null;
  const lit = info.lit;
  const boiling = info.boilKind !== null;

  return (
    <div
      style={overlayStyle}
      onPointerDown={(e) => {
        e.preventDefault();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={panelStyle}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>🍳 烹饪台</div>
        <div style={{ fontSize: 13, color: lit ? '#c4763a' : '#999', marginBottom: 12 }}>
          {lit
            ? `燃烧中 · 剩余约 ${Math.ceil(info.fuel)} 秒,可以烤制或煮汤`
            : '火还没点着,添柴引火;也可以用锄头挖走'}
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

        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>煮汤(每 5 秒煮好 1 份)</div>
        {boiling ? (
          <div style={{ ...rowStyle, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14 }}>
                <ItemIcon kind={info.boilKind!} size={18} /> {ITEMS[info.boilKind!].name} ×
                {info.boilLeft} 正在下锅
              </div>
              <div style={barStyle}>
                <div
                  style={{
                    ...barFillStyle,
                    width: `${Math.round(info.boilProgress * 100)}%`,
                  }}
                />
              </div>
            </div>
            {info.boilLeft > 0 && (
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  onTakeBoil();
                }}
                style={{ ...collectButtonStyle, background: '#8d9aa5' }}
              >
                取回 ×{info.boilLeft}
              </button>
            )}
            {info.outCount > 0 && info.outKind && (
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  onCollect();
                }}
                style={collectButtonStyle}
              >
                收取 {ITEMS[info.outKind].name} ×{info.outCount}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {info.outCount > 0 && info.outKind && (
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  onCollect();
                }}
                style={collectButtonStyle}
              >
                收取 {ITEMS[info.outKind].name} ×{info.outCount}
              </button>
            )}
            {boilables.length === 0 && (
              <span style={{ fontSize: 13, color: '#999' }}>背包里没有能煮的食材</span>
            )}
            {boilables.map((food) => {
              const soup = ITEMS[BOILABLE[food.kind]!];
              const max = count(food.kind);
              const n = Math.min(boilCounts[food.kind] ?? 1, max);
              return (
                <div key={food.kind} style={rowStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14 }}>
                      <ItemIcon kind={food.kind} size={18} /> {food.name} ×{max}
                    </div>
                    <div style={{ fontSize: 11, color: '#c4763a' }}>
                      → <ItemIcon kind={soup.kind} size={18} /> {soup.name}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StepButton
                      step={-1}
                      style={stepButtonStyle}
                      disabled={n <= 1}
                      onChange={(s) =>
                        setBoilCounts((c) => ({
                          ...c,
                          [food.kind]: Math.max(1, (c[food.kind] ?? 1) + s),
                        }))
                      }
                    />
                    <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 700 }}>{n}</span>
                    <StepButton
                      step={1}
                      style={stepButtonStyle}
                      disabled={n >= max}
                      onChange={(s) =>
                        setBoilCounts((c) => ({
                          ...c,
                          [food.kind]: Math.min(max, (c[food.kind] ?? 1) + s),
                        }))
                      }
                    />
                  </div>
                  <button
                    disabled={!lit}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      onBoil(food.kind, n);
                    }}
                    style={{ ...boilButtonStyle, opacity: lit ? 1 : 0.45 }}
                  >
                    煮
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>烤制</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {roastables.length === 0 && (
            <span style={{ fontSize: 13, color: '#999' }}>背包里没有能烤的食材</span>
          )}
          {roastables.map((food) => {
            const cooked = ITEMS[COOKABLE[food.kind]!];
            const max = count(food.kind);
            const n = Math.min(roastCounts[food.kind] ?? 1, max);
            return (
              <div key={food.kind} style={rowStyle}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14 }}>
                    <ItemIcon kind={food.kind} size={18} /> {food.name} ×{max}
                  </div>
                  <div style={{ fontSize: 11, color: '#c4763a' }}>
                    → <ItemIcon kind={cooked.kind} size={18} /> {cooked.name}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StepButton
                    step={-1}
                    style={stepButtonStyle}
                    disabled={n <= 1}
                    onChange={(s) =>
                      setRoastCounts((c) => ({
                        ...c,
                        [food.kind]: Math.max(1, (c[food.kind] ?? 1) + s),
                      }))
                    }
                  />
                  <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 700 }}>{n}</span>
                  <StepButton
                    step={1}
                    style={stepButtonStyle}
                    disabled={n >= max}
                    onChange={(s) =>
                      setRoastCounts((c) => ({
                        ...c,
                        [food.kind]: Math.min(max, (c[food.kind] ?? 1) + s),
                      }))
                    }
                  />
                </div>
                <button
                  disabled={!lit}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onRoast(food.kind, n);
                  }}
                  style={{ ...roastButtonStyle, opacity: lit ? 1 : 0.45 }}
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
  border: '2px solid #c4763a',
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

const boilButtonStyle: CSSProperties = {
  padding: '8px 14px',
  borderRadius: 10,
  border: 'none',
  background: '#c4763a',
  color: '#fff',
  fontWeight: 700,
  fontSize: 14,
  touchAction: 'none',
  userSelect: 'none',
};

const roastButtonStyle: CSSProperties = {
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

const collectButtonStyle: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 10,
  border: 'none',
  background: '#4caf50',
  color: '#fff',
  fontWeight: 700,
  fontSize: 13,
  whiteSpace: 'nowrap',
  touchAction: 'none',
  userSelect: 'none',
};

const barStyle: CSSProperties = {
  height: 8,
  marginTop: 6,
  borderRadius: 4,
  background: 'rgba(0,0,0,0.08)',
  overflow: 'hidden',
};

const barFillStyle: CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg,#c4763a,#e8a04d)',
  transition: 'width 0.2s linear',
};
