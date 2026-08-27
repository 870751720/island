import type { HudSnapshot } from '@/game/Game';

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4em' }}>
      <span style={{ width: '2.5em' }}>{label}</span>
      <div style={{ flex: 1, minWidth: '6em', height: 10, background: 'rgba(0,0,0,0.35)', borderRadius: 5 }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 5 }} />
      </div>
    </div>
  );
}

export function Hud({ hud }: { hud: HudSnapshot }) {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 'max(10px, env(safe-area-inset-top))',
          left: 'max(10px, env(safe-area-inset-left))',
          right: 'max(10px, env(safe-area-inset-right))',
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.75)',
          borderRadius: 10,
          fontFamily: 'sans-serif',
          fontSize: 'clamp(12px, 3.5vw, 14px)',
          color: '#333',
          maxWidth: 260,
        }}
      >
        <StatBar label="生命" value={hud.health} color="#e74c3c" />
        <StatBar label="饥饿" value={hud.hunger} color="#e67e22" />
        <StatBar label="口渴" value={hud.thirst} color="#3498db" />
        <div style={{ marginTop: 2 }}>
          🪵 {hud.wood} · 🪨 {hud.stone} · 🍒 {hud.berry}
        </div>
      </div>
      {hud.dead && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)',
            color: '#fff',
            fontFamily: 'sans-serif',
            fontSize: 'clamp(20px, 6vw, 32px)',
          }}
        >
          你没能活下来…刷新页面重新开始
        </div>
      )}
    </>
  );
}
