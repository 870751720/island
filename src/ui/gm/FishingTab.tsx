'use client';

import { useState } from 'react';
import { GmSystem, type GmConfig } from '@/game/systems/GmSystem';
import { ActionButton, StepperRow } from './controls';

/** 钓鱼档位名称(GM 面板概率权重用) */
const TIER_NAMES = ['杂物', '普通鱼', '大鱼', '珍宝'];

/** 钓鱼 tab:发放鱼竿与四档概率权重调节 */
export function FishingTab({
  onGiveRod,
  onSetConfig,
}: {
  onGiveRod: () => void;
  onSetConfig: (patch: Partial<GmConfig>) => void;
}) {
  const [weights, setWeights] = useState<number[]>([...GmSystem.fishingTierWeights]);

  const setWeight = (i: number, v: number) => {
    const next = weights.map((w, j) => (j === i ? v : w));
    onSetConfig({ fishingTierWeights: next });
    setWeights(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ActionButton label="发放鱼竿 ×1" tone="primary" onClick={onGiveRod} />
      {TIER_NAMES.map((name, i) => (
        <StepperRow
          key={name}
          label={`${name}权重`}
          value={weights[i]}
          onChange={(v) => setWeight(i, v)}
        />
      ))}
    </div>
  );
}
