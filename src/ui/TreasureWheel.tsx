'use client';

import { useState, type CSSProperties } from 'react';
import type { ResourceKind } from '@/game/systems/Inventory';
import { TIER_LOOT } from '@/game/systems/FishTable';
import { ITEMS } from '@/game/systems/Items';
import { ItemIcon } from './ItemIcon';

/** 转盘分区:四档奖池的顺序固定,保证客户端与快照回流的落点一致 */
const SEGMENTS: ResourceKind[] = TIER_LOOT[4].map((e) => e.kind);
const SEG_ANGLE = 360 / SEGMENTS.length;
/** 转动总圈数与时长:足够长以看清减速落定 */
const SPIN_TURNS = 4;
const SPIN_SECONDS = 3.4;
const SECTOR_COLORS = ['#f7d774', '#e8b84b', '#f2cd5e', '#d9a53c', '#f7d774', '#e8b84b'];

/**
 * 四档稀世珍宝转盘:连点收竿后不直接结算,弹出转盘由玩家亲手转出珍宝,
 * 转定后才回调 onClaim 入包。目标道具由房主抽定随快照回流,转盘只是表现层。
 */
export function TreasureWheel({
  kind,
  onClaim,
}: {
  kind: ResourceKind | null;
  onClaim: () => void;
}) {
  const [phase, setPhase] = useState<'ready' | 'spinning' | 'result'>('ready');
  const [rotation, setRotation] = useState(0);

  if (!kind) return null;

  const spin = () => {
    if (phase !== 'ready') return;
    const index = SEGMENTS.indexOf(kind);
    // 指针固定在正上方:转盘需转过 -(扇区中心角) 才能让指针落在该扇区;附扇区内随机偏移更自然
    const jitter = (Math.random() - 0.5) * (SEG_ANGLE - 16);
    const target = (360 - (index * SEG_ANGLE + SEG_ANGLE / 2) + jitter + 360) % 360;
    setRotation((r) => r + SPIN_TURNS * 360 + ((target - (r % 360)) + 360) % 360);
    setPhase('spinning');
  };

  const size = Math.min(300, Math.floor((typeof window === 'undefined' ? 375 : window.innerWidth) * 0.8));

  return (
    <div style={overlayStyle}>
      <div style={titleStyle}>🎁 钓到了稀世珍宝!</div>
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* 顶部指针 */}
        <div style={pointerStyle(size)} />
        <div
          onPointerDown={(e) => {
            e.preventDefault();
            spin();
          }}
          style={{
            ...wheelStyle(size),
            transform: `rotate(${rotation}deg)`,
            transition: phase === 'spinning' ? `transform ${SPIN_SECONDS}s cubic-bezier(0.12, 0.82, 0.16, 1)` : 'none',
            cursor: phase === 'ready' ? 'pointer' : 'default',
          }}
          onTransitionEnd={() => phase === 'spinning' && setPhase('result')}
        >
          {SEGMENTS.map((seg, i) => (
            <div
              key={seg}
              style={{
                position: 'absolute',
                inset: 0,
                transform: `rotate(${i * SEG_ANGLE + SEG_ANGLE / 2}deg)`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: size * 0.045,
              }}
            >
              <ItemIcon kind={seg} size={Math.round(size * 0.085)} />
              <span style={segNameStyle(size)}>{ITEMS[seg].name}</span>
            </div>
          ))}
        </div>
        {/* 转盘中心轴帽 */}
        <div style={hubStyle(size)} />
      </div>
      {phase === 'ready' && (
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            spin();
          }}
          style={actionStyle}
        >
          转动转盘
        </button>
      )}
      {phase === 'result' && (
        <div style={resultBoxStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ItemIcon kind={kind} size={30} />
            <span style={{ fontSize: 20, fontWeight: 800, color: '#6b4b12' }}>
              {ITEMS[kind].name}
            </span>
          </div>
          <button onPointerDown={(e) => { e.preventDefault(); onClaim(); }} style={actionStyle}>
            收入背包
          </button>
        </div>
      )}
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 18,
  background: 'radial-gradient(circle, rgba(60,42,0,0.55), rgba(20,12,0,0.82))',
  touchAction: 'none',
  userSelect: 'none',
  zIndex: 60,
  fontFamily: 'sans-serif',
};

const titleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: '#f7d774',
  textShadow: '0 2px 6px rgba(0,0,0,0.6)',
};

const wheelStyle = (size: number): CSSProperties => ({
  width: size,
  height: size,
  borderRadius: '50%',
  border: '6px solid #9a6b16',
  background: `conic-gradient(${SECTOR_COLORS.map((c, i) => `${c} ${i * SEG_ANGLE}deg ${(i + 1) * SEG_ANGLE}deg`).join(', ')})`,
  boxShadow: '0 6px 24px rgba(0,0,0,0.45), inset 0 0 0 3px rgba(255,255,255,0.35)',
  position: 'relative',
});

const segNameStyle = (size: number): CSSProperties => ({
  marginTop: 2,
  fontSize: Math.max(10, Math.round(size * 0.042)),
  fontWeight: 700,
  color: '#5b3f0e',
  whiteSpace: 'nowrap',
  textShadow: '0 1px 0 rgba(255,255,255,0.4)',
});

const hubStyle = (size: number): CSSProperties => ({
  position: 'absolute',
  left: '50%',
  top: '50%',
  width: size * 0.16,
  height: size * 0.16,
  transform: 'translate(-50%, -50%)',
  borderRadius: '50%',
  background: 'radial-gradient(circle at 35% 30%, #fff3cf, #d9a53c)',
  border: '3px solid #9a6b16',
  boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
});

const pointerStyle = (size: number): CSSProperties => ({
  position: 'absolute',
  left: '50%',
  top: -6,
  transform: 'translateX(-50%)',
  width: 0,
  height: 0,
  borderLeft: `${size * 0.045}px solid transparent`,
  borderRight: `${size * 0.045}px solid transparent`,
  borderTop: `${size * 0.09}px solid #e74c3c`,
  filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))',
  zIndex: 2,
});

const actionStyle: CSSProperties = {
  minWidth: 180,
  padding: '14px 32px',
  borderRadius: 26,
  border: '3px solid #9a6b16',
  background: 'linear-gradient(#ffe9a8, #f0c75e)',
  color: '#5b3f0e',
  fontSize: 19,
  fontWeight: 800,
  fontFamily: 'sans-serif',
  touchAction: 'none',
  userSelect: 'none',
  boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
};

const resultBoxStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 14,
  padding: '18px 30px',
  borderRadius: 20,
  background: 'rgba(255,246,214,0.96)',
  boxShadow: '0 6px 22px rgba(0,0,0,0.4)',
};
