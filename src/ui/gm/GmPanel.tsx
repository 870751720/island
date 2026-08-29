'use client';

import { useState } from 'react';
import type { ResourceKind } from '@/game/systems/Inventory';
import { PlayerTab } from './PlayerTab';
import { WorldTab } from './WorldTab';
import { FishingTab } from './FishingTab';
import { ItemsTab } from './ItemsTab';

/** GM 面板可对 Game 实例执行的动作,由 GameplayUI 通过回调注入 */
export type GmActions = {
  restoreStatus: () => void;
  setTime: (t: number) => void;
  setWeather: (type: 'sunny' | 'rain') => void;
  giveItem: (kind: ResourceKind, count: number) => void;
};

const TABS = [
  { id: 'player', label: '玩家' },
  { id: 'world', label: '世界' },
  { id: 'fishing', label: '钓鱼' },
  { id: 'items', label: '物品' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** GM 面板:分模块 tab 的调试工具弹窗 */
export function GmPanel({ onClose, actions }: { onClose: () => void; actions: GmActions }) {
  const [tab, setTab] = useState<TabId>('player');

  return (
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={cardStyle}>
        <div style={titleStyle}>GM 面板</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                ...tabStyle,
                background: tab === t.id ? '#4a3b2a' : 'rgba(0,0,0,0.08)',
                color: tab === t.id ? '#fff' : '#4a3b2a',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'player' && <PlayerTab onRestoreStatus={actions.restoreStatus} />}
        {tab === 'world' && <WorldTab onSetTime={actions.setTime} onSetWeather={actions.setWeather} />}
        {tab === 'fishing' && <FishingTab onGiveRod={() => actions.giveItem('fishingrod', 1)} />}
        {tab === 'items' && <ItemsTab onGiveItem={actions.giveItem} />}
        <button onClick={onClose} style={closeStyle}>
          关闭
        </button>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
} as const;

const cardStyle = {
  width: 'min(320px, 86vw)',
  padding: 20,
  background: '#faf6ef',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
  fontFamily: 'sans-serif',
} as const;

const titleStyle = {
  marginBottom: 14,
  textAlign: 'center',
  fontSize: 17,
  fontWeight: 700,
  color: '#4a3b2a',
} as const;

const tabStyle = {
  flex: 1,
  minHeight: 40,
  border: 'none',
  borderRadius: 10,
  fontFamily: 'sans-serif',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
} as const;

const closeStyle = {
  marginTop: 16,
  width: '100%',
  minHeight: 44,
  border: 'none',
  borderRadius: 10,
  background: '#8a6f4b',
  color: '#fff',
  fontFamily: 'sans-serif',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
} as const;
