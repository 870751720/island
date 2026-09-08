'use client';

import { ItemIcon } from './ItemIcon';
import { ITEMS } from '@/game/systems/Items';
import { BREWABLE, BREW_COST } from '@/game/systems/Wine';
import type { HudSnapshot } from '@/game/Game';
import type { ResourceKind } from '@/game/systems/Inventory';

type Props = {
  hud: HudSnapshot;
  /** 把背包里该种类全部原料丢进酿酒桶 */
  onFeed: (kind: ResourceKind) => void;
  /** 收取桶里酿好的全部酒 */
  onCollect: () => void;
  onClose: () => void;
};

const SLOT_SIZE = 48;
const SLOT_GAP = 6;
const COLUMNS = 5;

/** 酿酒桶面板:上半为当前酒种/剩余原料/发酵进度与待收酒,下半为背包(可投的原料格,桶被占用时异种置灰) */
export function BrewBarrelPanel({ hud, onFeed, onCollect, onClose }: Props) {
  const info = hud.brewBarrelInfo;
  if (!info) return null;
  // 背包里的可酿酒原料(按格子顺序)
  const feedable = hud.slots.filter((slot) => slot && BREWABLE[slot.kind] !== undefined) as {
    kind: ResourceKind;
    count: number;
  }[];
  // 桶被占用时只接受同种原料,异种置灰
  const locked = info.kind !== null && (info.rawLeft > 0 || info.bottles > 0);
  const feedStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${COLUMNS}, ${SLOT_SIZE}px)`,
    gap: SLOT_GAP,
    justifyContent: 'center',
  };
  const slotStyle = (clickable: boolean): React.CSSProperties => ({
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: 10,
    border: '2px solid rgba(0,0,0,0.12)',
    background: 'rgba(255,255,255,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    touchAction: 'none',
    userSelect: 'none',
    boxSizing: 'border-box',
    opacity: clickable ? 1 : 0.35,
  });

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
          marginTop: 'max(12px, calc(50vh - 230px))',
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
        <div style={{ fontWeight: 700, margin: '2px 2px 8px' }}>🍺 酿酒桶(每 45 秒用 {BREW_COST} 个原料酿 1 瓶)</div>
        {info.kind !== null ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', minHeight: SLOT_SIZE }}>
            <div style={slotStyle(true)}>
              <ItemIcon kind={info.kind} size={26} />
              <span
                style={{
                  position: 'absolute',
                  right: 3,
                  bottom: 1,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#555',
                }}
              >
                ×{info.rawLeft}
              </span>
              <span
                style={{
                  position: 'absolute',
                  left: 3,
                  top: 1,
                  fontSize: 10,
                  color: '#8e3a52',
                  fontWeight: 700,
                }}
              >
                {BREW_COST}酿1
              </span>
            </div>
            <div style={slotStyle(true)}>
              <ItemIcon kind={BREWABLE[info.kind]!} size={26} />
              <span
                style={{
                  position: 'absolute',
                  right: 3,
                  bottom: 1,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#555',
                }}
              >
                ×{info.bottles}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#888', padding: '12px 0' }}>桶是空的,丢点原料进来吧</div>
        )}
        {/* 发酵进度条 */}
        <div
          style={{
            height: 8,
            margin: '10px 2px 8px',
            borderRadius: 4,
            background: 'rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.round(info.progress * 100)}%`,
              height: '100%',
              background: 'linear-gradient(90deg,#8e3a52,#b0496b)',
              transition: 'width 0.2s linear',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 2px 4px' }}>
          <span style={{ flex: 1 }}>
            桶内酒 <b>🍷×{info.bottles}</b>
          </span>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onCollect();
            }}
            disabled={info.bottles <= 0}
            style={{
              padding: '6px 14px',
              borderRadius: 10,
              border: 'none',
              background: info.bottles > 0 ? '#4caf50' : '#bbb',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              touchAction: 'none',
              userSelect: 'none',
            }}
          >
            全部收取
          </button>
        </div>
        <div style={{ fontWeight: 700, margin: '12px 2px 8px' }}>🎒 背包(点击投料,一次只酿一种)</div>
        {feedable.length > 0 ? (
          <div style={feedStyle}>
            {feedable.map((slot, i) => {
              const clickable = !locked || slot.kind === info.kind;
              return (
                <div
                  key={`${slot.kind}-${i}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (clickable) onFeed(slot.kind);
                  }}
                  style={slotStyle(clickable)}
                >
                  <ItemIcon kind={slot.kind} size={26} />
                  <span
                    style={{
                      position: 'absolute',
                      right: 3,
                      bottom: 1,
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#555',
                    }}
                  >
                    ×{slot.count}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#888', padding: '8px 0' }}>
            背包里没有可酿酒的原料({ITEMS.brewBarrel.name}只收浆果/苹果/羊奶/黄金鱼)
          </div>
        )}
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
