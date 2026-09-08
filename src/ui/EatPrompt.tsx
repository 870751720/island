'use client';

import { ItemIcon } from './ItemIcon';
import type { CSSProperties } from 'react';
import type { HudSnapshot } from '@/game/Game';
import { EAT_PROMPT_HUNGER, firstFoodEntryIn } from '@/game/systems/Food';
import { isWineKind } from '@/game/systems/Wine';
import { promptCardStyle, promptWrapStyle } from './promptCard';

/** 饥饿低于阈值且背包有食物时弹出的进食卡片:单吃一个,或点「吃饱」连续吃到满(移动中不显示,捡回卡片出现时让位) */
export function EatPrompt({
  hud,
  onEat,
  onEatFull,
  suppressed,
}: {
  hud: HudSnapshot;
  onEat: () => void;
  onEatFull: () => void;
  suppressed: boolean;
}) {
  if (
    suppressed ||
    hud.eatName !== null ||
    hud.hunger >= EAT_PROMPT_HUNGER ||
    hud.dead ||
    hud.moving
  )
    return null;
  const entry = firstFoodEntryIn(hud.slots);
  if (!entry) return null;
  return (
    <div style={{ ...promptWrapStyle(hud), display: 'flex', gap: 6 }}>
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          onEat();
        }}
        style={{ ...promptCardStyle, minWidth: 0, minHeight: 44, padding: '6px 14px' }}
      >
        <ItemIcon kind={entry.food.kind} size={28} />
        <span>
          {isWineKind(entry.food.kind) ? '喝' : '吃'}{entry.food.name}
          <span style={{ color: '#4caf50' }}>(+{entry.food.hunger})</span>
        </span>
      </button>
      {entry.count > 1 && (
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            onEatFull();
          }}
          style={fullButtonStyle}
        >
          吃饱
        </button>
      )}
    </div>
  );
}

const fullButtonStyle: CSSProperties = {
  ...promptCardStyle,
  minWidth: 0,
  minHeight: 44,
  padding: '6px 10px',
  fontSize: 14,
  background: '#4caf50',
  color: '#fff',
};
