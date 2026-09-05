'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ResourceKind } from '@/game/systems/Inventory';
import { TIER_LOOT } from '@/game/systems/FishTable';
import { ITEMS } from '@/game/systems/Items';
import { ItemIcon } from './ItemIcon';

/** 转盘分区:四档奖池的顺序固定,保证客户端与快照回流的落点一致 */
const SEGMENTS: ResourceKind[] = TIER_LOOT[4].map((e) => e.kind);
const SEG_ANGLE = 360 / SEGMENTS.length;
/** 转动总圈数与时长:开局飞快、末段缓慢爬格落定 */
const SPIN_TURNS = 5;
const SPIN_SECONDS = 4.6;
/** 减速曲线指数:越大前期越快、末段越慢 */
const EASE_POWER = 3.2;
const SECTOR_COLORS = ['#f7d774', '#e8b84b', '#f2cd5e', '#d9a53c', '#f7d774', '#e8b84b'];

/** 入场与氛围动画:金色光芒旋转、转盘弹跳落位、标题呼吸 */
const WHEEL_KEYFRAMES = `
@keyframes treasure-rays { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
@keyframes treasure-pop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
@keyframes treasure-glow { 0%, 100% { text-shadow: 0 2px 6px rgba(0,0,0,0.6), 0 0 12px rgba(255,214,102,0.4); } 50% { text-shadow: 0 2px 6px rgba(0,0,0,0.6), 0 0 26px rgba(255,214,102,0.95); } }
@keyframes treasure-sparkle { 0%, 100% { opacity: 0.15; transform: scale(0.7); } 50% { opacity: 0.9; transform: scale(1.15); } }
@keyframes treasure-fade { from { opacity: 0; } to { opacity: 1; } }
`;

/** 单个星点装饰:随机方位、错峰闪烁,烘托稀世珍宝的贵气 */
function sparkleStyle(size: number, i: number): CSSProperties {
  const angle = (i / 12) * 360 + i * 37;
  const radius = size * (0.46 + (i % 3) * 0.06);
  return {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: size * 0.035,
    height: size * 0.035,
    borderRadius: '50%',
    background: 'radial-gradient(circle, #fffbe6, rgba(255,214,102,0))',
    transform: `translate(-50%, -50%) rotate(${angle}deg) translate(${radius}px)`,
    animation: `treasure-sparkle ${1.4 + (i % 4) * 0.35}s ease-in-out ${i * 0.12}s infinite`,
    pointerEvents: 'none',
  };
}

/**
 * 四档稀世珍宝转盘:连点收竿后不直接结算,弹出转盘由玩家亲手转出珍宝,
 * 转定后才回调 onClaim 入包。目标道具由房主按权重抽定随快照回流,转盘只是表现层。
 * 旋转由 rAF 逐帧驱动 easeOut 曲线(先快后慢),滚过格线播嗒声、定格播中奖号角。
 */
export function TreasureWheel({
  kind,
  onClaim,
  onSfx,
}: {
  kind: ResourceKind | null;
  onClaim: () => void;
  /** UI 表现层音效出口(滚轮嗒声/中奖项),非必需以防脱离 Game 使用 */
  onSfx?: (name: 'wheelTick' | 'treasureWin') => void;
}) {
  const [phase, setPhase] = useState<'ready' | 'spinning' | 'result'>('ready');
  const [rotation, setRotation] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  if (!kind) return null;

  const spin = () => {
    if (phase !== 'ready') return;
    const index = SEGMENTS.indexOf(kind);
    // 指针固定在正上方:转盘需转过 -(扇区中心角) 才能让指针落在该扇区;附扇区内随机偏移更自然
    const jitter = (Math.random() - 0.5) * (SEG_ANGLE - 16);
    const target = (360 - (index * SEG_ANGLE + SEG_ANGLE / 2) + jitter + 360) % 360;
    setPhase('spinning');

    const from = 0;
    const delta = SPIN_TURNS * 360 + ((target - 0) % 360 + 360) % 360;
    const start = performance.now();
    let lastSlot = 0;

    // 逐帧推进:角度走 1-(1-p)^k 的减速曲线,每跨过一条格线播一声「嗒」,
    // 由频率自然呈现「先密集后稀疏」的滚轮减速听感
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / (SPIN_SECONDS * 1000));
      const eased = 1 - Math.pow(1 - p, EASE_POWER);
      const angle = from + delta * eased;
      const slot = Math.floor(angle / SEG_ANGLE);
      if (slot !== lastSlot) {
        lastSlot = slot;
        onSfx?.('wheelTick');
      }
      setRotation(angle);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else {
        onSfx?.('treasureWin');
        setPhase('result');
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const size = Math.min(300, Math.floor((typeof window === 'undefined' ? 375 : window.innerWidth) * 0.8));

  return (
    <div style={overlayStyle}>
      <style>{WHEEL_KEYFRAMES}</style>
      <div style={titleStyle}>🎁 钓到了稀世珍宝!</div>
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* 金色旋转光芒底座:比转盘大一圈,缓慢旋转滚动 */}
        <div style={raysStyle(size)} />
        {/* 环绕星点 */}
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} style={sparkleStyle(size, i)} />
        ))}
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
            animation: phase === 'ready' ? 'treasure-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both' : undefined,
            cursor: phase === 'ready' ? 'pointer' : 'default',
          }}
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
        <div style={hintStyle}>亲手转动命运之轮,看看海神赐你哪件宝物</div>
      )}
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
        <div style={{ ...resultBoxStyle, animation: 'treasure-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
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
  animation: 'treasure-fade 0.25s ease-out both',
};

const titleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: '#f7d774',
  animation: 'treasure-glow 1.8s ease-in-out infinite',
};

const hintStyle: CSSProperties = {
  fontSize: 13,
  color: 'rgba(255,236,180,0.85)',
  textShadow: '0 1px 3px rgba(0,0,0,0.6)',
};

/** 金色光芒底座:锥形渐变明暗辐条,叠在转盘下方缓慢旋转 */
const raysStyle = (size: number): CSSProperties => ({
  position: 'absolute',
  left: '50%',
  top: '50%',
  width: size * 1.5,
  height: size * 1.5,
  borderRadius: '50%',
  background:
    'repeating-conic-gradient(rgba(255,214,102,0.22) 0deg 12deg, rgba(255,214,102,0) 12deg 30deg)',
  animation: 'treasure-rays 14s linear infinite',
  pointerEvents: 'none',
});

const wheelStyle = (size: number): CSSProperties => ({
  width: size,
  height: size,
  borderRadius: '50%',
  border: '6px solid #9a6b16',
  background: `conic-gradient(${SECTOR_COLORS.map((c, i) => `${c} ${i * SEG_ANGLE}deg ${(i + 1) * SEG_ANGLE}deg`).join(', ')})`,
  boxShadow: '0 6px 24px rgba(0,0,0,0.45), inset 0 0 0 3px rgba(255,255,255,0.35), 0 0 34px rgba(255,214,102,0.5)',
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
