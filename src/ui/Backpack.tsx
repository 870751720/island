'use client';

import { useState } from 'react';
import type { HudSnapshot } from '@/game/Game';
import type { InventorySlot, ResourceKind } from '@/game/systems/Inventory';
import { ITEMS } from '@/game/systems/Items';
import { FOODS } from '@/game/systems/Food';

type Props = {
  open: boolean;
  onToggle: () => void;
  hud: HudSnapshot;
  /** 使用(吃)该食物道具,由外层触发进食并关闭背包 */
  onUseItem: (kind: ResourceKind) => void;
  /** 丢弃一个该道具到地上 */
  onDropItem: (kind: ResourceKind) => void;
};

function isFood(kind: ResourceKind): boolean {
  return FOODS.some((f) => f.kind === kind);
}

const SLOT_SIZE = 52;
const SLOT_GAP = 8;
const COLUMNS = 5;

function slotStyle(filled: boolean, selected: boolean): React.CSSProperties {
  return {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: 10,
    border: selected ? '2px solid #4caf50' : '2px solid rgba(0,0,0,0.12)',
    background: filled ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    position: 'relative',
    touchAction: 'none',
    userSelect: 'none',
    boxSizing: 'border-box',
  };
}

function countBadge(count: number): React.ReactNode {
  return (
    <span
      style={{
        position: 'absolute',
        right: 3,
        bottom: 1,
        fontSize: 11,
        fontWeight: 700,
        color: '#555',
        fontFamily: 'sans-serif',
      }}
    >
      ×{count}
    </span>
  );
}

function actionButton(disabled: boolean, label: string, color: string, onPress: () => void): React.ReactNode {
  return (
    <button
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        if (!disabled) onPress();
      }}
      style={{
        flex: 1,
        padding: '10px 0',
        borderRadius: 10,
        border: 'none',
        background: disabled ? '#bbb' : color,
        color: '#fff',
        fontSize: 15,
        fontWeight: 700,
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {label}
    </button>
  );
}

/** 背包:格子制(相同道具叠加,默认 10 格),点击道具查看描述,可丢弃或使用食物 */
export function Backpack({ open, onToggle, hud, onUseItem, onDropItem }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selected: InventorySlot = selectedIndex !== null ? hud.slots[selectedIndex] : null;
  const selectedDef = selected ? ITEMS[selected.kind] : null;

  return (
    <>
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          onToggle();
        }}
        style={{
          position: 'absolute',
          // 位于右中侧工具按钮正上方(工具按钮 top 50%、高 72px)
          top: 'calc(50% - 36px - 72px - 12px)',
          right: 'max(16px, env(safe-area-inset-right))',
          width: 72,
          height: 72,
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(255,255,255,0.75)',
          fontSize: 24,
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        🎒
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.35)',
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            // 点到遮罩本身才关闭,面板内点击不冒泡关闭
            if (e.target === e.currentTarget) onToggle();
          }}
        >
        <div
          style={{
            width: `min(88vw, ${COLUMNS * (SLOT_SIZE + SLOT_GAP) + 2 * SLOT_GAP + 24}px)`,
            maxHeight: '80vh',
            overflowY: 'auto',
            padding: '14px 12px',
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 14,
            fontFamily: 'sans-serif',
            fontSize: 15,
            color: '#333',
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          }}
        >
          <div style={{ fontWeight: 700, margin: '0 2px 8px' }}>背包</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${COLUMNS}, ${SLOT_SIZE}px)`,
              gap: SLOT_GAP,
              justifyContent: 'center',
            }}
          >
            {Array.from({ length: hud.capacity }, (_, i) => {
              const slot = hud.slots[i];
              return (
                <div
                  key={i}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (slot) setSelectedIndex(selectedIndex === i ? null : i);
                  }}
                  style={slotStyle(!!slot, selectedIndex === i)}
                >
                  {slot && (
                    <>
                      <span>{ITEMS[slot.kind].icon}</span>
                      {countBadge(slot.count)}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {selected && selectedDef && (
            <div
              style={{
                marginTop: 10,
                padding: '10px 8px 8px',
                borderTop: '1px solid rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 24 }}>{selectedDef.icon}</span>
                <span style={{ fontWeight: 700, flex: 1 }}>{selectedDef.name}</span>
                <span style={{ color: '#888' }}>×{selected.count}</span>
              </div>
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
                {selectedDef.description}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {isFood(selectedDef.kind) &&
                  actionButton(false, '使用', '#4caf50', () => {
                    setSelectedIndex(null);
                    onUseItem(selectedDef.kind);
                  })}
                {actionButton(false, '丢弃', '#e67e22', () => {
                  onDropItem(selectedDef.kind);
                  setSelectedIndex(null);
                })}
              </div>
            </div>
          )}
        </div>
        </div>
      )}
    </>
  );
}
