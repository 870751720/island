import type { HudSnapshot } from '@/game/Game';

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: '2.5em' }}>{label}</span>
      <div style={{ width: 160, height: 10, background: 'rgba(0,0,0,0.35)', borderRadius: 5 }}>
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
          top: 12,
          left: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.75)',
          borderRadius: 10,
          fontFamily: 'sans-serif',
          fontSize: 14,
          color: '#333',
        }}
      >
        <StatBar label="生命" value={hud.health} color="#e74c3c" />
        <StatBar label="饥饿" value={hud.hunger} color="#e67e22" />
        <StatBar label="口渴" value={hud.thirst} color="#3498db" />
        <div style={{ marginTop: 4 }}>
          🪵 {hud.wood} · 🪨 {hud.stone} · 🍒 {hud.berry}
        </div>
      </div>
      {hud.prompt && !hud.dead && (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '6px 16px',
            background: 'rgba(0,0,0,0.55)',
            color: '#fff',
            borderRadius: 20,
            fontFamily: 'sans-serif',
            fontSize: 14,
          }}
        >
          {hud.prompt}
        </div>
      )}
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
            fontSize: 32,
          }}
        >
          你没能活下来…刷新页面重新开始
        </div>
      )}
    </>
  );
}
