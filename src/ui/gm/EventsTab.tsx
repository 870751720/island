'use client';

import { useState } from 'react';
import { GmSystem, type GmConfig } from '@/game/systems/GmSystem';
import { ActionButton, StepperRow } from './controls';

/** 特殊事件 tab:喝水出鳄鱼的触发与概率调节、树生长间隔调节 */
export function EventsTab({
  onTriggerCrocodile,
  onSetConfig,
}: {
  onTriggerCrocodile: () => void;
  onSetConfig: (patch: Partial<GmConfig>) => void;
}) {
  const [chance, setChance] = useState(Math.round(GmSystem.crocodileChance * 1000) / 10);
  const [interval, setIntervalSec] = useState(GmSystem.treeGrowthInterval);

  const setPercent = (v: number) => {
    const pct = Math.min(100, Math.max(0, Math.round(v * 10) / 10));
    setChance(pct);
    onSetConfig({ crocodileChance: pct / 100 });
  };

  const setInterval = (v: number) => {
    const sec = Math.min(3600, Math.max(1, Math.round(v)));
    setIntervalSec(sec);
    onSetConfig({ treeGrowthInterval: sec });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ActionButton label="触发一次喝水出鳄鱼" tone="primary" onClick={onTriggerCrocodile} />
      <StepperRow label="喝水出鳄鱼概率 %" value={chance} step={10} onChange={setPercent} />
      <StepperRow label="树生长间隔 秒" value={interval} step={10} onChange={setInterval} />
    </div>
  );
}
