'use client';

import { ItemIcon } from './ItemIcon';
import type { HudSnapshot } from '@/game/Game';
import { ITEMS } from '@/game/systems/Items';
import { TOOL_IDS, toolName } from '@/game/systems/Crafting';
import { fadeStyle } from './fade';

/** 玩家靠近地面掉落物时在左边弹出的「捡回」卡片,点击后拾回背包 */
export function DropPrompt({ hud, onPickup }: { hud: HudSnapshot; onPickup: () => void }) {
  const drop = hud.nearDrop;
  if (!drop || hud.dead) return null;
  const item = ITEMS[drop.kind];
  // 工具类掉落物按携带等级显示名称(如「石斧」「铁斧」)
  const name = (TOOL_IDS as string[]).includes(drop.kind)
    ? toolName(drop.kind as (typeof TOOL_IDS)[number], drop.tier ?? 1)
    : item.name;
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        onPickup();
      }}
      style={{
        position: 'absolute',
        left: 'max(12px, env(safe-area-inset-left))',
        top: 'calc(50% - 150px)',
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
        ...fadeStyle(hud.busy),
      }}
    >
      <ItemIcon kind={item.kind} size={28} />
      <span>
        捡回{name}
        {drop.count > 1 ? `×${drop.count}` : ''}
        <br />
        <span style={{ fontSize: 12, color: '#888' }}>
          {drop.source === 'loot'
            ? '狩猎获得的战利品'
            : drop.source === 'overflow'
              ? '背包放不下,先放在地上'
              : '附近有丢弃的物品'}
        </span>
      </span>
    </button>
  );
}
