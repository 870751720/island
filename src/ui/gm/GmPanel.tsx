'use client';

import { gameTheme, gamePanelStyle, gameButtonStyle } from '../gameTheme';

import type { PlayerGender } from '@/game/entities/PlayerModel';
import { useState } from 'react';
import type { ResourceKind } from '@/game/systems/Inventory';
import type { ToolId } from '@/game/systems/Crafting';
import type { GmConfig } from '@/game/systems/GmSystem';
import type { AnimalSpecies } from '@/game/entities/Wildlife';
import type { Game } from '@/game/Game';
import { PlayerTab } from './PlayerTab';
import { WorldTab } from './WorldTab';
import { FishingTab } from './FishingTab';
import { ItemsTab } from './ItemsTab';
import { AnimalsTab } from './AnimalsTab';
import { MusicTab } from './MusicTab';
import { EventsTab } from './EventsTab';

/** GM 面板可对 Game 实例执行的动作,由 GameplayUI 通过回调注入 */
export type GmActions = {
  getGame: () => Game | null;
  restoreStatus: () => void;
  setGender: (gender: PlayerGender) => void;
  setDay: (day: number) => void;
  setWeather: (type: 'sunny' | 'wind' | 'rain' | 'snow') => void;
  setConfig: (patch: Partial<GmConfig>) => void;
  giveItem: (kind: ResourceKind, count: number) => void;
  giveTool: (tool: ToolId, tier: 1 | 2 | 3) => void;
  spawnAnimal: (species: AnimalSpecies) => void;
  triggerCrocodile: () => void;
};

const TABS = [
  { id: 'player', label: '玩家' },
  { id: 'world', label: '世界' },
  { id: 'music', label: '音乐' },
  { id: 'fishing', label: '钓鱼' },
  { id: 'items', label: '物品' },
  { id: 'animals', label: '动物' },
  { id: 'events', label: '特殊事件' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** GM 面板:分模块 tab 的调试工具弹窗 */
export function GmPanel({ onClose, actions, gender }: { onClose: () => void; actions: GmActions; gender: PlayerGender }) {
  const [tab, setTab] = useState<TabId>('player');

  return (
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={cardStyle}>
        <div style={titleStyle}>GM 面板</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                ...tabStyle,
                background: tab === t.id ? gameTheme.selected : gameTheme.inset,
                color: gameTheme.ink,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'player' && <PlayerTab gender={gender} onSetGender={actions.setGender} onRestoreStatus={actions.restoreStatus} onSetConfig={actions.setConfig} />}
        {tab === 'world' && <WorldTab getGame={actions.getGame} onSetDay={actions.setDay} onSetWeather={actions.setWeather} onSetConfig={actions.setConfig} />}
        {tab === 'fishing' && <FishingTab onGiveRod={() => actions.giveItem('fishingrod', 1)} onSetConfig={actions.setConfig} />}
        {tab === 'music' && <MusicTab getGame={actions.getGame} />}
        {tab === 'items' && <ItemsTab onGiveItem={actions.giveItem} onGiveTool={actions.giveTool} />}
        {tab === 'animals' && <AnimalsTab onSpawn={actions.spawnAnimal} />}
        {tab === 'events' && (
          <EventsTab onTriggerCrocodile={actions.triggerCrocodile} onSetConfig={actions.setConfig} />
        )}
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
  background: gameTheme.overlay,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
} as const;

const cardStyle = {
  width: 'min(320px, 86vw)',
  maxHeight: '85dvh',
  overflowY: 'auto',
  padding: 20,
  ...gamePanelStyle,
  borderRadius: 22,
  boxShadow: gameTheme.shadow,
  fontFamily: gameTheme.font,
} as const;

const titleStyle = {
  marginBottom: 14,
  textAlign: 'center',
  fontSize: 17,
  fontWeight: 700,
  color: gameTheme.ink,
} as const;

const tabStyle = {
  flex: 1,
  minHeight: 44,
  minWidth: 60,
  ...gameButtonStyle,
  borderRadius: 10,
  fontFamily: gameTheme.font,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
} as const;

const closeStyle = {
  marginTop: 16,
  width: '100%',
  minHeight: 44,
  ...gameButtonStyle,
  borderRadius: 10,
  background: gameTheme.action,
  color: gameTheme.ink,
  fontFamily: gameTheme.font,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
} as const;
