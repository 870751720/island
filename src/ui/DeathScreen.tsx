'use client';

export function DeathScreen({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'clamp(20px, 6vh, 36px)',
        background: 'rgba(10, 14, 12, 0.72)',
        fontFamily: 'sans-serif',
        animation: 'death-fade 0.6s ease',
      }}
    >
      <style>{`@keyframes death-fade { from { opacity: 0; } to { opacity: 1; } }`}</style>
      <div style={{ fontSize: 'clamp(52px, 16vw, 84px)', lineHeight: 1 }}>💀</div>
      <div style={{ color: '#fff', fontSize: 'clamp(22px, 6.5vw, 32px)', letterSpacing: '0.1em' }}>
        你没能活下来…
      </div>
      <button
        onClick={onConfirm}
        style={{
          minWidth: 'min(60vw, 220px)',
          minHeight: 56,
          border: 'none',
          borderRadius: 16,
          background: 'linear-gradient(#8aa88f, #5f7d64)',
          color: '#fff',
          fontSize: 'clamp(16px, 4.5vw, 20px)',
          fontWeight: 700,
          letterSpacing: '0.2em',
          boxShadow: '0 5px 0 #43604a',
          cursor: 'pointer',
        }}
      >
        确 认
      </button>
    </div>
  );
}
