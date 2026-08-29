'use client';

import type { CSSProperties } from 'react';
import type { HudSnapshot } from '@/game/Game';

/** 屏幕中心的钓鱼按钮与咬钩全屏点击层:手持鱼竿站在可钓点时出现按钮;咬钩时点击屏幕任意处收竿 */
export function FishingControls({
  hud,
  onStart,
  onHook,
}: {
  hud: HudSnapshot;
  onStart: () => void;
  onHook: () => void;
}) {
  if (hud.dead) return null;

  // 咬钩反应窗口:全屏任意点击收竿(高档位需连点),盖住其余交互
  if (hud.biteActive) {
    const multi = hud.biteNeed > 1;
    return (
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          onHook();
        }}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          background: multi
            ? 'radial-gradient(circle, rgba(190,120,255,0.28), rgba(0,0,0,0))'
            : 'radial-gradient(circle, rgba(255,235,130,0.25), rgba(0,0,0,0))',
          touchAction: 'none',
          userSelect: 'none',
          zIndex: 40,
          animation: 'bite-flash 0.35s ease-in-out infinite',
        }}
      >
        <div style={biteHintStyle}>
          {multi ? '💥 咬钩了!快连点屏幕!' : '🐟 咬钩了!点一下屏幕!'}
        </div>
        {multi && (
          <div style={clickCountStyle}>
            {hud.biteClicks}/{hud.biteNeed}
          </div>
        )}
        <style>{`@keyframes bite-flash { 0%, 100% { opacity: 0.55 } 50% { opacity: 1 } }`}</style>
      </div>
    );
  }

  if (!hud.canFish) return null;
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        onStart();
      }}
      style={buttonStyle}
    >
      🎣
      <span style={{ fontSize: 14 }}>钓鱼</span>
    </button>
  );
}

const buttonStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  bottom: '28%',
  transform: 'translateX(-50%)',
  width: 84,
  height: 84,
  borderRadius: '50%',
  border: '3px solid #4caf50',
  background: 'rgba(255,255,255,0.92)',
  fontSize: 32,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#333',
  touchAction: 'none',
  userSelect: 'none',
  boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
  zIndex: 20,
};

const biteHintStyle: CSSProperties = {
  padding: '14px 26px',
  borderRadius: 18,
  background: 'rgba(211,84,0,0.9)',
  color: '#fff',
  fontSize: 20,
  fontWeight: 700,
  fontFamily: 'sans-serif',
  whiteSpace: 'nowrap',
};

const clickCountStyle: CSSProperties = {
  padding: '8px 24px',
  borderRadius: 16,
  background: 'rgba(0,0,0,0.55)',
  color: '#f7d774',
  fontSize: 26,
  fontWeight: 800,
  fontFamily: 'sans-serif',
};
