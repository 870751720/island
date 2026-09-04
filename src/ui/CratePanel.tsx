'use client';

import { ItemIcon } from './ItemIcon';
import type { HudSnapshot } from '@/game/Game';
import type { InventorySlot, ResourceKind } from '@/game/systems/Inventory';
import { ITEMS } from '@/game/systems/Items';
import { CRATE_CAPACITY } from '@/game/entities/Crate';

type Props = {
  hud: HudSnapshot;
  /** 把背包里该种类全部道具整格存入木箱 */
  onStore: (kind: ResourceKind) => void;
  /** 把木箱里该种类全部道具整格取回背包 */
  onTake: (kind: ResourceKind) => void;
  onClose: () => void;
};

const SLOT_SIZE = 48;
const SLOT_GAP = 6;
const COLUMNS = 5;

function slotStyle(filled: boolean): React.CSSProperties {
  return {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: 10,
    border: '2px solid rgba(0,0,0,0.12)',
    background: filled ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
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

/** 木箱储物面板:上半为木箱 10 格(点击取回背包),下半为背包(点击存入木箱),均为整格转移 */
export function CratePanel({ hud, onStore, onTake, onClose }: Props) {
  const crateSlots = hud.crateSlots ?? [];
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${COLUMNS}, ${SLOT_SIZE}px)`,
    gap: SLOT_GAP,
    justifyContent: 'center',
  };
  const renderGrid = (
    slots: InventorySlot[],
    capacity: number,
    onTap: (kind: ResourceKind) => void
  ) => (
    <div style={gridStyle}>
      {Array.from({ length: capacity }, (_, i) => {
        const slot = slots[i] ?? null;
        return (
          <div
            key={i}
            onPointerDown={(e) => {
              e.preventDefault();
              if (slot) onTap(slot.kind);
            }}
            style={slotStyle(!!slot)}
          >
            {slot && (
              <>
                <ItemIcon kind={slot.kind} size={26} />
                {countBadge(slot.count)}
              </>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.35)',
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          marginTop: 'max(12px, calc(50vh - 220px))',
          width: `min(88vw, ${COLUMNS * (SLOT_SIZE + SLOT_GAP) + 2 * SLOT_GAP + 24}px)`,
          padding: '12px',
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 14,
          fontFamily: 'sans-serif',
          fontSize: 15,
          color: '#333',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ fontWeight: 700, margin: '2px 2px 8px' }}>📦 木箱(点击格子取回)</div>
        {renderGrid(crateSlots, CRATE_CAPACITY, onTake)}
        <div style={{ fontWeight: 700, margin: '14px 2px 8px' }}>🎒 背包(点击格子存入)</div>
        {renderGrid(hud.slots, hud.capacity, onStore)}
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            onClose();
          }}
          style={{
            width: '100%',
            marginTop: 12,
            padding: '10px 0',
            borderRadius: 10,
            border: 'none',
            background: '#4caf50',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            touchAction: 'none',
            userSelect: 'none',
          }}
        >
          关闭
        </button>
      </div>
    </div>
  );
}
