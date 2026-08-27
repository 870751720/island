'use client';

import type { HudSnapshot } from '@/game/Game';

type Props = {
  open: boolean;
  onToggle: () => void;
  items: HudSnapshot;
  onEatBerry: () => void;
};

const ENTRIES: { kind: 'wood' | 'stone' | 'berry'; icon: string; name: string }[] = [
  { kind: 'wood', icon: '🪵', name: '木材' },
  { kind: 'stone', icon: '🪨', name: '石块' },
  { kind: 'berry', icon: '🍒', name: '浆果' },
];

export function Backpack({ open, onToggle, items, onEatBerry }: Props) {
  return (
    <>
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          onToggle();
        }}
        style={{
          position: 'absolute',
          top: 'max(10px, env(safe-area-inset-top))',
          right: 'max(10px, env(safe-area-inset-right))',
          width: 48,
          height: 48,
          borderRadius: 12,
          border: 'none',
          background: 'rgba(255,255,255,0.75)',
          fontSize: 24,
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        🎒
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'max(66px, calc(env(safe-area-inset-top) + 56px))',
            right: 'max(10px, env(safe-area-inset-right))',
            width: 'min(78vw, 260px)',
            padding: '12px 14px',
            background: 'rgba(255,255,255,0.92)',
            borderRadius: 12,
            fontFamily: 'sans-serif',
            fontSize: 15,
            color: '#333',
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>背包</div>
          {ENTRIES.map(({ kind, icon, name }) => (
            <div
              key={kind}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 0',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ flex: 1 }}>{name}</span>
              <span>× {items[kind]}</span>
              {kind === 'berry' && (
                <button
                  disabled={items.berry <= 0}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onEatBerry();
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: items.berry > 0 ? '#4caf50' : '#bbb',
                    color: '#fff',
                    fontSize: 14,
                    touchAction: 'none',
                    userSelect: 'none',
                  }}
                >
                  吃
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
