'use client';

import type { HudSnapshot } from '@/game/Game';
import { firstFoodIn } from '@/game/systems/Food';

/** 饥饿低于 50% 且背包有食物时弹出的进食卡片,点击吃背包里最前面的食物 */
export function EatPrompt({ hud, onEat }: { hud: HudSnapshot; onEat: () => void }) {
  if (hud.eatName !== null || hud.hunger >= 50 || hud.dead) return null;
  const food = firstFoodIn(hud.slots);
  if (!food) return null;
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        onEat();
      }}
      style={{
        position: 'absolute',
        left: 'max(12px, env(safe-area-inset-left))',
        top: 'calc(50% + 84px)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 150,
        minHeight: 56,
        padding: '8px 16px',
        borderRadius: 14,
        border: '2px solid #e67e22',
        background: 'rgba(255,255,255,0.92)',
        color: '#333',
        fontFamily: 'sans-serif',
        fontSize: 15,
        textAlign: 'left',
        touchAction: 'none',
        userSelect: 'none',
        boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
      }}
    >
      <span style={{ fontSize: 26 }}>{food.icon}</span>
      <span>
        吃{food.name}
        <br />
        <span style={{ fontSize: 12, color: '#888' }}>你有点饿了({Math.floor(hud.hunger)}%)</span>
      </span>
    </button>
  );
}
