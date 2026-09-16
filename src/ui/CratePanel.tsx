'use client';
import { HudIcon } from './hud/HudIcon';

import { gameTheme, gamePanelStyle, gameButtonStyle } from './gameTheme';

import { useRef, useState } from 'react';
import { ItemIcon } from './ItemIcon';
import type { HudSnapshot } from '@/game/GameContracts';
import type { InventorySlot, ResourceKind } from '@/game/systems/Inventory';
import { ITEMS } from '@/game/systems/Items';
import { CRATE_CAPACITY } from '@/game/entities/Crate';
import { startHoldTap } from './holdRepeat';

type Props = {
  hud: HudSnapshot;
  /** 把背包里该种类道具存入木箱(count 为 Infinity 时整格存入);返回是否成功 */
  onStore: (kind: ResourceKind, count: number) => boolean;
  /** 把木箱里该种类道具取回背包(count 为 Infinity 时整格取回);返回是否成功 */
  onTake: (kind: ResourceKind, count: number) => boolean;
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
    border: gameTheme.line,
    background: filled ? gameTheme.surface : gameTheme.inset,
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
        color: gameTheme.ink,
        fontFamily: gameTheme.font,
      }}
    >
      ×{count}
    </span>
  );
}

/** 木箱储物面板:上半为木箱 10 格,下半为背包;点按格子整格转移,长按连发步进转移(越按越快) */
export function CratePanel({ hud, onStore, onTake, onClose }: Props) {
  const crateSlots = hud.crateSlots ?? [];
  const crateCapacity = hud.crateCapacity ?? CRATE_CAPACITY;
  const [page, setPage] = useState(0);
  const pages = Math.ceil(crateCapacity / 10);
  const currentPage = Math.min(page, pages - 1);
  /** 进行中的长按连发停止函数(松手/取消时调用) */
  const holdRef = useRef<(() => void) | null>(null);
  const stopHold = () => {
    holdRef.current?.();
    holdRef.current = null;
  };
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${COLUMNS}, ${SLOT_SIZE}px)`,
    gap: SLOT_GAP,
    justifyContent: 'center',
  };
  const renderGrid = (
    slots: InventorySlot[],
    capacity: number,
    transfer: (kind: ResourceKind, count: number) => boolean
  ) => (
    <div style={gridStyle}>
      {Array.from({ length: capacity }, (_, i) => {
        const slot = slots[i] ?? null;
        return (
          <div
            key={i}
            onPointerDown={(e) => {
              e.preventDefault();
              if (!slot) return;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              holdRef.current = startHoldTap({
                onTap: () => transfer(slot.kind, Infinity),
                onRepeat: (step) => transfer(slot.kind, step),
              });
            }}
            onPointerUp={stopHold}
            onPointerCancel={stopHold}
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
        background: gameTheme.overlay,
      }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) { e.preventDefault(); onClose(); }
      }}
    >
      <div
        style={{
          marginTop: 'max(12px, calc(50vh - 220px))',
          width: `min(88vw, ${COLUMNS * (SLOT_SIZE + SLOT_GAP) + 2 * SLOT_GAP + 24}px)`,
          padding: '12px',
          ...gamePanelStyle,
          borderRadius: 22,
          fontFamily: gameTheme.font,
          fontSize: 15,
          color: gameTheme.ink,
          boxShadow: gameTheme.shadow,
        }}
      >
        <div style={{ fontWeight: 700, margin: '2px 2px 8px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ItemIcon kind={hud.crateKind ?? 'crate'} size={20} /> {ITEMS[hud.crateKind ?? 'crate'].name}(点按取回,长按步进)
          </span>
        </div>
        {renderGrid(crateSlots.slice(currentPage * 10, currentPage * 10 + 10), Math.min(10, crateCapacity), onTake)}
        {pages > 1 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
          <button disabled={currentPage === 0} style={gameButtonStyle} onClick={() => setPage(currentPage - 1)}>上一页</button>
          <span>{currentPage + 1} / {pages} · {crateCapacity}格</span>
          <button disabled={currentPage === pages - 1} style={gameButtonStyle} onClick={() => setPage(currentPage + 1)}>下一页</button>
        </div>}
        <div style={{ fontWeight: 700, margin: '14px 2px 8px' }}><HudIcon name="backpack" size={24} /> 背包(点按存入,长按步进)</div>
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
            ...gameButtonStyle,
            background: gameTheme.action,
            color: gameTheme.ink,
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
