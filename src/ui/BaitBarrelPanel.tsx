'use client';

import { ItemIcon } from './ItemIcon';
import { ITEMS } from '@/game/systems/Items';
import { BAIT_YIELD } from '@/game/systems/Food';
import type { HudSnapshot } from '@/game/Game';
import type { ResourceKind } from '@/game/systems/Inventory';

type Props = {
  hud: HudSnapshot;
  /** 把背包里该种类全部食物丢进饵料桶 */
  onFeed: (kind: ResourceKind) => void;
  /** 收取桶内发酵好的全部鱼饵 */
  onCollect: () => void;
  onClose: () => void;
};

const SLOT_SIZE = 48;
const SLOT_GAP = 6;
const COLUMNS = 5;

/** 饵料桶面板:上半为桶内食物队列(显示各自兑换率)与待收鱼饵、发酵进度,下半为背包(点击可投喂的食物) */
export function BaitBarrelPanel({ hud, onFeed, onCollect, onClose }: Props) {
  const info = hud.baitBarrelInfo;
  if (!info) return null;
  // 背包里的可投喂食物(按格子顺序)
  const feedable = hud.slots.filter((slot) => slot && BAIT_YIELD[slot.kind] !== undefined) as {
    kind: ResourceKind;
    count: number;
  }[];
  const feedStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${COLUMNS}, ${SLOT_SIZE}px)`,
    gap: SLOT_GAP,
    justifyContent: 'center',
  };

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
        <div style={{ fontWeight: 700, margin: '2px 2px 8px' }}>🪣 饵料桶(食物每 5 秒发酵 1 个)</div>
        {info.foods.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', minHeight: SLOT_SIZE }}>
            {info.foods.map((food, i) => (
              <div
                key={`${food.kind}-${i}`}
                style={{
                  width: SLOT_SIZE,
                  height: SLOT_SIZE,
                  borderRadius: 10,
                  border: '2px solid rgba(0,0,0,0.12)',
                  background: 'rgba(255,255,255,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  boxSizing: 'border-box',
                }}
              >
                <ItemIcon kind={food.kind} size={26} />
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
                  ×{food.count}
                </span>
                <span
                  style={{
                    position: 'absolute',
                    left: 3,
                    top: 1,
                    fontSize: 10,
                    color: '#a0742c',
                    fontWeight: 700,
                  }}
                >
                  🪱{BAIT_YIELD[food.kind]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#888', padding: '12px 0' }}>桶是空的,丢点吃的进来吧</div>
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
              background: 'linear-gradient(90deg,#d98c3f,#e6b422)',
              transition: 'width 0.2s linear',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 2px 4px' }}>
          <span style={{ flex: 1 }}>
            桶内鱼饵 <b>🪱×{info.bait}</b>
          </span>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onCollect();
            }}
            disabled={info.bait <= 0}
            style={{
              padding: '6px 14px',
              borderRadius: 10,
              border: 'none',
              background: info.bait > 0 ? '#4caf50' : '#bbb',
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
        <div style={{ fontWeight: 700, margin: '12px 2px 8px' }}>🎒 背包(点击投喂,角标为每只换的鱼饵)</div>
        {feedable.length > 0 ? (
          <div style={feedStyle}>
            {feedable.map((slot, i) => (
              <div
                key={`${slot.kind}-${i}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  onFeed(slot.kind);
                }}
                style={{
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
                }}
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
                <span
                  style={{
                    position: 'absolute',
                    left: 3,
                    top: 1,
                    fontSize: 10,
                    color: '#a0742c',
                    fontWeight: 700,
                  }}
                >
                  🪱{BAIT_YIELD[slot.kind]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#888', padding: '8px 0' }}>
            背包里没有可投喂的食物({ITEMS.baitBarrel.name}不挑食,水果/鱼/肉/熟食都行)
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
