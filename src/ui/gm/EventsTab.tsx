'use client';

import { useState } from 'react';
import { GmSystem, type GmConfig } from '@/game/systems/GmSystem';
import { ActionButton, StepperRow } from './controls';

/** 特殊事件：个人收藏解锁、鳄鱼袭击与树木生长。 */
export function EventsTab({
  onTriggerCrocodile,
  onUnlockDiscoveries,
  onSetConfig,
}: {
  onTriggerCrocodile: () => void;
  onUnlockDiscoveries: () => void;
  onSetConfig: (patch: Partial<GmConfig>) => void;
}) {
  const [interval, setIntervalSec] = useState(GmSystem.treeGrowthInterval);

  const setInterval = (v: number) => {
    const sec = Math.min(3600, Math.max(1, Math.round(v)));
    setIntervalSec(sec);
    onSetConfig({ treeGrowthInterval: sec });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ActionButton label="解锁全部隐藏配方与图鉴" tone="primary" onClick={onUnlockDiscoveries} />
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>仅解锁自己的收藏，跨存档保留；不消耗材料，不发放成品。</p>
      <ActionButton label="触发一次喝水出鳄鱼" tone="primary" onClick={onTriggerCrocodile} />
      <StepperRow label="树生长间隔 秒" value={interval} step={10} max={3600} onChange={setInterval} />
    </div>
  );
}
