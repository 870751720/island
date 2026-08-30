import type { HudSnapshot } from '@/game/Game';

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

/**
 * 左上角状态区:生命/饥饿/口渴 + 天数在状态栏下方。
 * 红心为 GM 面板的隐藏入口。
 */
export function Hud({ hud, onHeartTap }: { hud: HudSnapshot; onHeartTap: () => void }) {
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
    </div>
  );
}
