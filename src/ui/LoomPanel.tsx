'use client';

import { ItemIcon } from './ItemIcon';
import { ITEMS } from '@/game/systems/Items';
import type { HudSnapshot } from '@/game/Game';

type Props = {
  hud: HudSnapshot;
  /** 把背包里全部绳线丢进纺织机 */
  onFeed: () => void;
  /** 收取机内织好的全部布料 */
  onCollect: () => void;
  onClose: () => void;
};

const SLOT_SIZE = 48;

/** 纺织机面板:上半为机内绳线/布料与织布进度,下半为投入按钮(背包里的绳线) */
export function LoomPanel({ hud, onFeed, onCollect, onClose }: Props) {
  const info = hud.loomInfo;
  if (!info) return null;
  const ropeInBag = hud.slots.reduce(
    (sum, slot) => sum + (slot && slot.kind === 'rope' ? slot.count : 0),
    0
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
          marginTop: 'max(12px, calc(50vh - 190px))',
          width: 'min(88vw, 340px)',
          padding: '12px',
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 14,
          fontFamily: 'sans-serif',
          fontSize: 15,
          color: '#333',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ fontWeight: 700, margin: '2px 2px 8px' }}>🧵 纺织机(每 2 根绳线织 1 匹布料)</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', minHeight: SLOT_SIZE }}>
          <div
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
            <ItemIcon kind="rope" size={26} />
            <span style={{ position: 'absolute', right: 3, bottom: 1, fontSize: 11, fontWeight: 700, color: '#555' }}>
              ×{info.rope}
            </span>
          </div>
          <div
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
            <ItemIcon kind="cloth" size={26} />
            <span style={{ position: 'absolute', right: 3, bottom: 1, fontSize: 11, fontWeight: 700, color: '#555' }}>
              ×{info.cloth}
            </span>
          </div>
        </div>
        {/* 织布进度条 */}
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
              background: 'linear-gradient(90deg,#b5a642,#e8e2d4)',
              transition: 'width 0.2s linear',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, margin: '0 2px 4px' }}>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onFeed();
            }}
            disabled={ropeInBag <= 0}
            style={{
              flex: 1,
              padding: '6px 0',
              borderRadius: 10,
              border: 'none',
              background: ropeInBag > 0 ? '#b5a642' : '#bbb',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              touchAction: 'none',
              userSelect: 'none',
            }}
          >
            投入绳线 ×{ropeInBag}
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onCollect();
            }}
            disabled={info.cloth <= 0}
            style={{
              flex: 1,
              padding: '6px 0',
              borderRadius: 10,
              border: 'none',
              background: info.cloth > 0 ? '#4caf50' : '#bbb',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              touchAction: 'none',
              userSelect: 'none',
            }}
          >
            收取布料
          </button>
        </div>
        {ropeInBag <= 0 && (
          <div style={{ textAlign: 'center', color: '#888', padding: '8px 0 0' }}>
            背包里没有{ITEMS.rope.name},用工作台把植物纤维搓成绳线再回来吧
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
