'use client';

import { ItemIcon } from './ItemIcon';
import type { HudSnapshot } from '@/game/GameContracts';
import { ITEMS } from '@/game/systems/Items';
import { TOOL_IDS, toolName } from '@/game/systems/Crafting';
import { promptCardStyle, promptWrapStyle } from './promptCard';

/** 玩家靠近地面掉落物时在左边弹出的「捡回」卡片,点击后拾回背包(移动中不显示,三张左侧卡片互斥时优先级最高) */
export function DropPrompt({ hud, onPickup }: { hud: HudSnapshot; onPickup: () => void }) {
  const drop = hud.nearDrop;
  if (!drop || hud.dead || hud.moving) return null;
  const item = ITEMS[drop.kind];
  // 工具类掉落物按携带等级显示名称(如「石斧」「铁斧」)
  const name = (TOOL_IDS as string[]).includes(drop.kind)
    ? toolName(drop.kind as (typeof TOOL_IDS)[number], drop.tier ?? 1)
    : item.name;
  return (
    <div style={promptWrapStyle(hud)}>
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          onPickup();
        }}
        style={{ ...promptCardStyle, minWidth: 0, minHeight: 44, padding: '6px 14px' }}
      >
        <ItemIcon kind={item.kind} size={28} />
        <span>
          捡回{name}
          {drop.count > 1 ? `×${drop.count}` : ''}
        </span>
      </button>
    </div>
  );
}
