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

/** 左上角状态栏:生命/饥饿/口渴三条「图标 + 数值」 */
export function Hud({ hud }: { hud: HudSnapshot }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 'max(10px, env(safe-area-inset-top))',
        left: 'max(10px, env(safe-area-inset-left))',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        padding: '8px 12px',
        background: 'rgba(255,255,255,0.75)',
        borderRadius: 10,
        fontFamily: 'sans-serif',
        fontSize: 'clamp(12px, 3.5vw, 14px)',
      }}
    >
      <StatRow icon="❤️" value={hud.health} color="#c0392b" />
      <StatRow icon="🍗" value={hud.hunger} color="#b9631e" />
      <StatRow icon="💧" value={hud.thirst} color="#2471a3" />
    </div>
  );
}
