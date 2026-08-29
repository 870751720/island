'use client';

import { useState } from 'react';
import { GmSystem } from '@/game/systems/GmSystem';
import { ActionButton, ToggleRow } from './controls';

/** 玩家 tab:无敌/死亡开关与状态回满 */
export function PlayerTab({ onRestoreStatus }: { onRestoreStatus: () => void }) {
  const [godMode, setGodMode] = useState(GmSystem.godMode);
  const [allowDeath, setAllowDeath] = useState(GmSystem.allowDeath);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ToggleRow
        label="无敌模式"
        value={godMode}
        onChange={(v) => {
          GmSystem.godMode = v;
          setGodMode(v);
        }}
      />
      <ToggleRow
        label="允许死亡"
        value={allowDeath}
        onChange={(v) => {
          GmSystem.allowDeath = v;
          setAllowDeath(v);
        }}
      />
      <ActionButton label="状态回满(复活)" tone="primary" onClick={onRestoreStatus} />
    </div>
  );
}
