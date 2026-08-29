'use client';

import { useMemo, useState } from 'react';
import { ITEMS } from '@/game/systems/Items';
import type { ResourceKind } from '@/game/systems/Inventory';

/** 物品 tab:全物品发放,可按名称筛选 */
export function ItemsTab({ onGiveItem }: { onGiveItem: (kind: ResourceKind, count: number) => void }) {
  const [query, setQuery] = useState('');
  const kinds = useMemo(
    () =>
      (Object.keys(ITEMS) as ResourceKind[]).filter((k) =>
        ITEMS[k].name.includes(query.trim())
      ),
    [query]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="筛选物品名…"
        style={{
          width: '100%',
          minHeight: 40,
          padding: '6px 12px',
          border: 'none',
          borderRadius: 10,
          background: 'rgba(0,0,0,0.06)',
          fontFamily: 'sans-serif',
          fontSize: 14,
          color: '#4a3b2a',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ maxHeight: '42vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {kinds.map((kind) => {
          const item = ITEMS[kind];
          return (
            <div
              key={kind}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 10,
                background: 'rgba(0,0,0,0.06)',
                fontSize: 14,
                color: '#4a3b2a',
                fontFamily: 'sans-serif',
              }}
            >
              <span>
                {item.icon} {item.name}
              </span>
              <span style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => onGiveItem(kind, 1)} style={giveStyle}>
                  +1
                </button>
                <button onClick={() => onGiveItem(kind, 5)} style={giveStyle}>
                  +5
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const giveStyle = {
  minWidth: 44,
  height: 36,
  border: 'none',
  borderRadius: 8,
  background: '#8a6f4b',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
} as const;
