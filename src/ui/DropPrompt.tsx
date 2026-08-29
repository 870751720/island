'use client';

import type { HudSnapshot } from '@/game/Game';
import { ITEMS } from '@/game/systems/Items';

/** 玩家靠近地面掉落物时在左侧弹出的「捡回」卡片,点击后拾回背包 */
export function DropPrompt({ hud, onPickup }: { hud: HudSnapshot; onPickup: () => void }) {
  const drop = hud.nearDrop;
  if (!drop || hud.dead) return null;
  const item = ITEMS[drop.kind];
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
      }}
    >
      <span style={{ fontSize: 26 }}>{item.icon}</span>
      <span>
        捡回{item.name}
        {drop.count > 1 ? `×${drop.count}` : ''}
        <br />
        <span style={{ fontSize: 12, color: '#888' }}>
          {drop.source === 'loot' ? '狩猎获得的战利品' : '附近有丢弃的物品'}
        </span>
      </span>
    </button>
  );
}
