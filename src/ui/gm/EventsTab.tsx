'use client';

import { useState } from 'react';
import { GmSystem, type GmConfig } from '@/game/systems/GmSystem';
import { ActionButton, StepperRow } from './controls';

/** 特殊事件 tab:喝水出鳄鱼的触发与概率调节、树生长节奏调节 */
export function EventsTab({
  onTriggerCrocodile,
  onSetConfig,
}: {
  onTriggerCrocodile: () => void;
  onSetConfig: (patch: Partial<GmConfig>) => void;
}) {
  const [chance, setChance] = useState(Math.round(GmSystem.crocodileChance * 100));
  const [growth, setGrowth] = useState(GmSystem.treeGrowthMultiplier);

  const setPercent = (v: number) => {
    const pct = Math.min(100, Math.max(0, v));
    setChance(pct);
    onSetConfig({ crocodileChance: pct / 100 });
  };

  const setGrowthMultiplier = (v: number) => {
    const m = Math.min(100, Math.max(0, v));
    setGrowth(m);
    onSetConfig({ treeGrowthMultiplier: m });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ActionButton label="触发一次喝水出鳄鱼" tone="primary" onClick={onTriggerCrocodile} />
      <StepperRow label="喝水出鳄鱼概率 %" value={chance} step={5} onChange={setPercent} />
      <StepperRow label="树生长节奏 ×" value={growth} step={1} onChange={setGrowthMultiplier} />
    </div>
  );
}
