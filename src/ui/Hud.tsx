import type { HudSnapshot } from '@/game/Game';

function StatRow({ icon, value, color }: { icon: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45em' }}>
      <span style={{ fontSize: '1.15em', lineHeight: 1 }}>{icon}</span>
      <div style={{ flex: 1, height: 8, background: 'rgba(0,0,0,0.35)', borderRadius: 4 }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
      <span style={{ width: '2.2em', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(value)}
      </span>
    </div>
  );
}

/** 左上角状态栏:生命/饥饿/口渴三条「图标 + 进度条 + 数值」 */
export function Hud({ hud }: { hud: HudSnapshot }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 'max(10px, env(safe-area-inset-top))',
        left: 'max(10px, env(safe-area-inset-left))',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        padding: '8px 12px',
        background: 'rgba(255,255,255,0.75)',
        borderRadius: 10,
        fontFamily: 'sans-serif',
        fontSize: 'clamp(12px, 3.5vw, 14px)',
        color: '#333',
        width: 'min(200px, 52vw)',
      }}
    >
      <StatRow icon="❤️" value={hud.health} color="#e74c3c" />
      <StatRow icon="🍗" value={hud.hunger} color="#e67e22" />
      <StatRow icon="💧" value={hud.thirst} color="#3498db" />
    </div>
  );
}
