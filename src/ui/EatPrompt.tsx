'use client';

import { ItemIcon } from './ItemIcon';
import type { HudSnapshot } from '@/game/Game';
import { firstFoodIn } from '@/game/systems/Food';
import { promptCardStyle, promptWrapStyle } from './promptCard';

/** 饥饿低于 50% 且背包有食物时弹出的进食卡片,点击吃背包里最前面的食物(移动中不显示,捡回卡片出现时让位) */
export function EatPrompt({
  hud,
  onEat,
  suppressed,
}: {
  hud: HudSnapshot;
  onEat: () => void;
  suppressed: boolean;
}) {
  if (suppressed || hud.eatName !== null || hud.hunger >= 50 || hud.dead || hud.moving) return null;
  const food = firstFoodIn(hud.slots);
  if (!food) return null;
  return (
    <div style={promptWrapStyle(hud)}>
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          onEat();
        }}
        style={promptCardStyle}
      >
        <ItemIcon kind={food.kind} size={28} />
        <span>
          吃{food.name}
          <br />
          <span style={{ fontSize: 12, color: '#888' }}>你有点饿了({Math.floor(hud.hunger)}%)</span>
        </span>
      </button>
    </div>
  );
}
