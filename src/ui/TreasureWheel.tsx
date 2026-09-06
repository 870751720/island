'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ResourceKind } from '@/game/systems/Inventory';
import { TIER_LOOT } from '@/game/systems/FishTable';
import { ITEMS } from '@/game/systems/Items';
import { ItemIcon } from './ItemIcon';

/** 滚轮格位:四档奖池的顺序固定,保证客户端与快照回流的落点一致 */
const SLOTS: ResourceKind[] = TIER_LOOT[4].map((e) => e.kind);
/** 滚轮上循环的圈数:越多转动越久,末段缓慢爬格落定 */
const LOOP_TURNS = 5;
const SPIN_SECONDS = 4.2;
/** 减速曲线指数:越大前期越快、末段越慢 */
const EASE_POWER = 3.2;
/** 滚轮窗口可见行数:上下各露半行,中心行定格高亮 */
const VISIBLE_ROWS = 3;

/** 入场与氛围动画:金色光芒旋转、滚轮弹跳落位、标题呼吸 */
const WHEEL_KEYFRAMES = `
@keyframes treasure-rays { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
@keyframes treasure-pop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
@keyframes treasure-glow { 0%, 100% { text-shadow: 0 2px 6px rgba(0,0,0,0.6), 0 0 12px rgba(255,214,102,0.4); } 50% { text-shadow: 0 2px 6px rgba(0,0,0,0.6), 0 0 26px rgba(255,214,102,0.95); } }
@keyframes treasure-sparkle { 0%, 100% { opacity: 0.15; transform: scale(0.7); } 50% { opacity: 0.9; transform: scale(1.15); } }
@keyframes treasure-fade { from { opacity: 0; } to { opacity: 1; } }
`;

/** 单个星点装饰:随机方位、错峰闪烁,烘托稀世珍宝的贵气 */
function sparkleStyle(width: number, i: number): CSSProperties {
  const angle = (i / 12) * 360 + i * 37;
  const radius = width * (0.5 + (i % 3) * 0.07);
  return {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: width * 0.03,
    height: width * 0.03,
    borderRadius: '50%',
    background: 'radial-gradient(circle, #fffbe6, rgba(255,214,102,0))',
    transform: `translate(-50%, -50%) rotate(${angle}deg) translate(${radius}px)`,
    animation: `treasure-sparkle ${1.4 + (i % 4) * 0.35}s ease-in-out ${i * 0.12}s infinite`,
    pointerEvents: 'none',
  };
}

/**
 * 四档稀世珍宝滚轮:连点收竿后不直接结算,弹出密码锁式单转轮,
 * 由玩家上下拨动(或点按钮)滚出珍宝,滚定后才回调 onClaim 入包。
 * 目标道具由房主按权重抽定随快照回流,滚轮只是表现层。
 * 滚动由 rAF 逐帧驱动 easeOut 曲线(先快后慢),滚过格线播嗒声、定格播中奖号角。
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
  const [offset, setOffset] = useState(0); // 以格为单位的连续偏移,中心行 = round(offset)
  const rafRef = useRef(0);
  const spinRef = useRef(false);
  /** 拨动检测:记录触点起始位置,松手时拨动幅度够大才触发滚动 */
  const dragStartRef = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  if (!kind) return null;

  const spin = () => {
    if (phase !== 'ready' || spinRef.current) return;
    spinRef.current = true;
    const targetSlot = SLOTS.indexOf(kind);
    // 从当前格出发,滚整数圈后停在目标格;附格内微偏移在 CSS 上自然吸附到中心
    const loops = Math.ceil((offset + 1) / SLOTS.length) + LOOP_TURNS;
    const target = loops * SLOTS.length + targetSlot;
    setPhase('spinning');

    const from = offset;
    const delta = target - from;
    const start = performance.now();
    let lastSlot = Math.round(from);

    // 逐帧推进:偏移走 1-(1-p)^k 的减速曲线,每跨过一条格线播一声「嗒」,
    // 由频率自然呈现「先密集后稀疏」的滚轮减速听感
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / (SPIN_SECONDS * 1000));
      const eased = 1 - Math.pow(1 - p, EASE_POWER);
      const value = from + delta * eased;
      const slot = Math.round(value);
      if (slot !== lastSlot) {
        lastSlot = slot;
        onSfx?.('wheelTick');
      }
      setOffset(p < 1 ? value : target);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else {
        onSfx?.('treasureWin');
        setPhase('result');
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  /** 触摸拨动:像拨密码锁转轮那样上下滑动,松手时拨动超过半格即触发滚动 */
  const onPointerDown = (e: React.PointerEvent) => {
    if (phase !== 'ready') return;
    dragStartRef.current = e.clientY;
    setDragging(true);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragStartRef.current == null) return;
    const dy = e.clientY - dragStartRef.current;
    dragStartRef.current = null;
    setDragging(false);
    if (Math.abs(dy) > 18) spin();
  };

  const width = Math.min(300, Math.floor((typeof window === 'undefined' ? 375 : window.innerWidth) * 0.8));
  const rowH = Math.round(width * 0.42);
  const height = rowH * VISIBLE_ROWS;
  // 循环条带:起始前多铺一组奖池,保证任意时刻中心行上下相邻行都有内容
  const strip = Array.from({ length: LOOP_TURNS + 4 }, () => SLOTS).flat();
  const baseSlot = Math.floor(offset / SLOTS.length) * SLOTS.length;
  const centerIndex = Math.round(offset) - baseSlot + SLOTS.length;
  const translate = -(offset - baseSlot + SLOTS.length) * rowH;

  return (
    <div style={overlayStyle}>
      <style>{WHEEL_KEYFRAMES}</style>
      <div style={titleStyle}>🎁 钓到了稀世珍宝!</div>
      <div style={{ position: 'relative', width, height }}>
        {/* 金色旋转光芒底座:比滚轮大一圈,缓慢旋转滚动 */}
        <div style={raysStyle(width, height)} />
        {/* 环绕星点 */}
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} style={sparkleStyle(width, i)} />
        ))}
        <div
          style={{
            ...caseStyle(width, height),
            animation: phase === 'ready' ? 'treasure-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both' : undefined,
          }}
        >
          {/* 滚轮窗口:上下用渐变遮罩收边,中心行落在高亮带 */}
          <div style={windowStyle(height)}>
            <div
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{
                ...drumStyle(rowH),
                transform: `translateY(${translate}px)`,
                cursor: phase === 'ready' ? (dragging ? 'grabbing' : 'grab') : 'default',
              }}
            >
              {strip.map((slot, i) => {
                const isCenter = i === centerIndex;
                return (
                  <div key={i} style={{ ...slotStyle(rowH), opacity: isCenter ? 1 : 0.45 }}>
                    <ItemIcon kind={slot} size={Math.round(rowH * 0.42)} />
                    <span style={slotNameStyle(rowH)}>{ITEMS[slot].name}</span>
                  </div>
                );
              })}
            </div>
            {/* 中心高亮带与格线压在滚轮上方 */}
            <div style={centerBandStyle(rowH, height)} />
          </div>
          {/* 上下棘轮帽:密码锁转轮的机械质感 */}
          <div style={notchStyle(width, true)} />
          <div style={notchStyle(width, false)} />
        </div>
      </div>
      {/* 底部操作区固定占位:转动时按钮隐藏也不挪动滚轮位置 */}
      <div style={footerStyle}>
        {phase === 'ready' && (
          <div style={hintStyle}>上下拨动锁轮,看看海神赐你哪件宝物</div>
        )}
        {phase === 'ready' && (
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              spin();
            }}
            style={actionStyle}
          >
            转动锁轮
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

/** 底部操作区:固定最小高度占位,内容随阶段切换但布局不跳动 */
const footerStyle: CSSProperties = {
  minHeight: 106,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 14,
};

/** 金色光芒底座:锥形渐变明暗辐条,叠在锁轮下方缓慢旋转(正圆) */
const raysStyle = (width: number, height: number): CSSProperties => {
  const d = Math.max(width, height) * 1.5;
  return {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: d,
    height: d,
    borderRadius: '50%',
    background:
      'repeating-conic-gradient(rgba(255,214,102,0.22) 0deg 12deg, rgba(255,214,102,0) 12deg 30deg)',
    animation: 'treasure-rays 14s linear infinite',
    pointerEvents: 'none',
  };
};

/** 锁轮外壳:铜框宝箱质感,包裹滚轮窗口 */
const caseStyle = (width: number, height: number): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  borderRadius: 22,
  border: '6px solid #9a6b16',
  background: 'linear-gradient(#7a5212, #8f6519)',
  boxShadow: '0 6px 24px rgba(0,0,0,0.45), inset 0 0 0 3px rgba(255,255,255,0.25), 0 0 34px rgba(255,214,102,0.5)',
  overflow: 'hidden',
});

/** 滚轮窗口:上下渐变遮罩模拟圆柱曲面的暗角 */
const windowStyle = (height: number): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
  background:
    'linear-gradient(rgba(30,20,0,0.55), rgba(30,20,0,0) 32%, rgba(30,20,0,0) 68%, rgba(30,20,0,0.55))',
});

const drumStyle = (rowH: number): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  willChange: 'transform',
  padding: `${rowH}px 0`,
  touchAction: 'none',
});

const slotStyle = (rowH: number): CSSProperties => ({
  height: rowH,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  justifyContent: 'center',
  width: '100%',
});

const slotNameStyle = (rowH: number): CSSProperties => ({
  fontSize: Math.max(13, Math.round(rowH * 0.3)),
  fontWeight: 700,
  color: '#fff3cf',
  whiteSpace: 'nowrap',
  textShadow: '0 1px 3px rgba(0,0,0,0.6)',
});

/** 中心高亮带:金边透明带 + 上下格线,标出定格格位 */
const centerBandStyle = (rowH: number, height: number): CSSProperties => ({
  position: 'absolute',
  left: 0,
  right: 0,
  top: (height - rowH) / 2,
  height: rowH,
  borderTop: '2px solid rgba(255,214,102,0.75)',
  borderBottom: '2px solid rgba(255,214,102,0.75)',
  background: 'rgba(255,214,102,0.12)',
  boxShadow: 'inset 0 0 18px rgba(255,214,102,0.25)',
  pointerEvents: 'none',
});

/** 外壳上下棘轮帽:密码锁转轮侧面的机械卡齿装饰 */
const notchStyle = (width: number, top: boolean): CSSProperties => ({
  position: 'absolute',
  left: '50%',
  top: top ? -2 : undefined,
  bottom: top ? undefined : -2,
  transform: 'translateX(-50%)',
  width: width * 0.5,
  height: 8,
  borderRadius: top ? '8px 8px 0 0' : '0 0 8px 8px',
  background: 'repeating-linear-gradient(90deg, #b8862c 0 8px, #7a5212 8px 16px)',
  pointerEvents: 'none',
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
