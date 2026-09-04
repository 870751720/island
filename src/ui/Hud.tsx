import { useState } from 'react';
import type { HudSnapshot } from '@/game/Game';
import type { HudBuff } from '@/game/systems/BuffSystem';

function StatRow({ icon, value, color }: { icon: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4em' }}>
      <span style={{ fontSize: '1.15em', lineHeight: 1 }}>{icon}</span>
      <span style={{ color, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
        {Math.round(value)}
      </span>
    </div>
  );
}

/** 状态栏右侧的一个 buff 图标:增益绿框/减益红框,限时 buff 带剩余秒数角标 */
function BuffIcon({ buff, onTap }: { buff: HudBuff; onTap: (e: React.PointerEvent) => void }) {
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        onTap(e);
      }}
      aria-label={buff.name}
      style={{
        position: 'relative',
        width: 34,
        height: 34,
        borderRadius: 10,
        border: `2px solid ${buff.good ? '#4caf50' : '#c0392d'}`,
        background: 'rgba(255,255,255,0.75)',
        fontSize: 17,
        lineHeight: 1,
        padding: 0,
        cursor: 'pointer',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {buff.icon}
      {buff.remain !== null && (
        <span
          style={{
            position: 'absolute',
            right: 1,
            bottom: -1,
            fontSize: 10,
            fontWeight: 700,
            color: '#555',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {buff.remain}
        </span>
      )}
    </button>
  );
}

/**
 * 左上角状态区:生命/饥饿/口渴 + 天数在状态栏下方,buff 图标紧挨在状态栏右侧;
 * 点 buff 图标弹出效果说明。红心为 GM 面板的隐藏入口。
 */
export function Hud({ hud, onHeartTap }: { hud: HudSnapshot; onHeartTap: () => void }) {
  const [tip, setTip] = useState<{ buff: HudBuff; x: number; y: number } | null>(null);
  return (
    <div
      style={{
        position: 'absolute',
        top: 'max(10px, env(safe-area-inset-top))',
        left: 'max(10px, env(safe-area-inset-left))',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        fontFamily: 'sans-serif',
        fontSize: 'clamp(12px, 3.5vw, 14px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.75)',
          borderRadius: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4em' }}>
          <span
            onClick={onHeartTap}
            style={{ fontSize: '1.15em', lineHeight: 1, cursor: 'pointer' }}
          >
            ❤️
          </span>
          <span style={{ color: '#c0392b', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
            {Math.round(hud.health)}
          </span>
        </div>
        <StatRow icon="🍗" value={hud.hunger} color="#b9631e" />
        <StatRow icon="💧" value={hud.thirst} color="#2471a3" />
        <div
          style={{
            color: '#5b4632',
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            borderTop: '1px solid rgba(91,70,50,0.2)',
            paddingTop: 3,
            marginTop: 2,
          }}
        >
          第 {hud.day} 天
        </div>
      </div>
      {hud.buffs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {hud.buffs.map((buff) => (
            <BuffIcon
              key={buff.id}
              buff={buff}
              onTap={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setTip(tip?.buff.id === buff.id ? null : { buff, x: rect.left + rect.width / 2, y: rect.bottom });
              }}
            />
          ))}
        </div>
      )}
      {tip && (
        <>
          <div
            onPointerDown={(e) => {
              e.preventDefault();
              setTip(null);
            }}
            style={{ position: 'fixed', inset: 0, zIndex: 60 }}
          />
          <div
            style={{
              position: 'fixed',
              left: Math.min(Math.max(tip.x - 115, 10), window.innerWidth - 240),
              top: tip.y + 8,
              width: 230,
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.98)',
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.1)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              fontFamily: 'sans-serif',
              fontSize: 13,
              color: '#333',
              lineHeight: 1.5,
              zIndex: 61,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{tip.buff.icon}</span>
              <span style={{ fontWeight: 700, flex: 1 }}>{tip.buff.name}</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: tip.buff.good ? '#4caf50' : '#c0392d',
                }}
              >
                {tip.buff.good ? '增益' : '减益'}
              </span>
            </div>
            <div style={{ marginTop: 4 }}>{tip.buff.description}</div>
          </div>
        </>
      )}
    </div>
  );
}
