'use client';

import { useState } from 'react';
import { GmSystem, type GmConfig } from '@/game/systems/GmSystem';
import { ActionButton, StepperRow, ToggleRow } from './controls';

/** 玩家 tab:无敌/死亡开关、攻击倍率与状态回满 */
export function PlayerTab({
  onRestoreStatus,
  onSetConfig,
}: {
  onRestoreStatus: () => void;
  onSetConfig: (patch: Partial<GmConfig>) => void;
}) {
  const [godMode, setGodMode] = useState(GmSystem.godMode);
  const [allowDeath, setAllowDeath] = useState(GmSystem.allowDeath);
  const [attackMultiplier, setAttackMultiplier] = useState(GmSystem.attackMultiplier);
  const [speedMultiplier, setSpeedMultiplier] = useState(GmSystem.speedMultiplier);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ToggleRow
        label="无敌模式"
        value={godMode}
        onChange={(v) => {
          onSetConfig({ godMode: v });
          setGodMode(v);
        }}
      />
      <ToggleRow
        label="允许死亡"
        value={allowDeath}
        onChange={(v) => {
          onSetConfig({ allowDeath: v });
          setAllowDeath(v);
        }}
      />
      <StepperRow
        label="攻击力倍率"
        value={attackMultiplier}
        min={0}
        onChange={(v) => {
          onSetConfig({ attackMultiplier: v });
          setAttackMultiplier(v);
        }}
      />
      <StepperRow
        label="移动速度倍率"
        value={speedMultiplier}
        min={0.1}
        step={0.5}
        onChange={(v) => {
          onSetConfig({ speedMultiplier: v });
          setSpeedMultiplier(v);
        }}
      />
      <ActionButton label="状态回满(复活)" tone="primary" onClick={onRestoreStatus} />
    </div>
  );
}
