'use client';

import { useEffect, useState } from 'react';
import { gmSnapshot, type GmConfig } from '@/game/systems/GmSystem';
import { HEART_MAX, type TameSpecies } from '@/game/systems/AnimalHusbandry';
import { ANIMAL_LABELS } from '@/game/entities/Wildlife';
import type { GmActions } from './GmPanel';
import { ActionButton, StepperRow } from './controls';
import { gameTheme } from '../gameTheme';

export function HusbandryTab({ actions }: { actions: GmActions }) {
  const [config, setConfig] = useState(gmSnapshot);
  useEffect(() => {
    const timer = window.setInterval(() => setConfig(gmSnapshot()), 300);
    return () => window.clearInterval(timer);
  }, []);
  const change = (patch: Partial<GmConfig>) => {
    actions.setConfig(patch);
    setConfig(gmSnapshot());
  };
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 8, color: gameTheme.ink }}>
    <ActionButton label="领取套索 ×10、剪刀、食料桶" tone="primary" onClick={() => {
      actions.giveItem('lasso', 10); actions.giveItem('shears', 1); actions.giveItem('feedBarrel', 1);
    }} />
    <ActionButton label="领取胡萝卜、烤兽肉各 ×30" onClick={() => {
      actions.giveItem('carrot', 30); actions.giveItem('cookedGameMeat', 30);
    }} />
    {(Object.keys(HEART_MAX) as TameSpecies[]).map(species => <ActionButton key={species}
      label={`生成${ANIMAL_LABELS[species]} · 爱心上限 ${HEART_MAX[species]}`}
      onClick={() => actions.spawnAnimal(species)} />)}
    <div style={{ fontSize: 13, lineHeight: 1.7 }}>狼每 5 秒、熊每 3 秒挣扎一次，最多 5 次。下方是整轮累计挣脱概率，单次概率按 1 − (1 − 总概率)^(1/5) 换算。修改影响后续判定，已发生的次数不重置。</div>
    <StepperRow label="狼总概率 %" value={Math.round(config.wolfEscapeChance * 100)} step={5} max={100}
      onChange={v => change({ wolfEscapeChance: Math.min(100, v) / 100 })} />
    <StepperRow label="熊总概率 %" value={Math.round(config.bearEscapeChance * 100)} step={5} max={100}
      onChange={v => change({ bearEscapeChance: Math.min(100, v) / 100 })} />
    <ActionButton label="均设 0%：稳定测试驯养" onClick={() => change({ wolfEscapeChance: 0, bearEscapeChance: 0 })} />
    <ActionButton label="均设 100%：下一次挣扎必脱" onClick={() => change({ wolfEscapeChance: 1, bearEscapeChance: 1 })} />
    <StepperRow label="爱心衰减倍率" value={config.husbandryDecaySpeed} step={1} max={120}
      onChange={v => change({ husbandryDecaySpeed: Math.min(120, v) })} />
    <ActionButton label="衰减 ×60：满心 30 秒耗尽" onClick={() => change({ husbandryDecaySpeed: 60 })} />
    <StepperRow label="奶毛生产倍率" value={config.husbandryProductionSpeed} step={1} max={120}
      onChange={v => change({ husbandryProductionSpeed: Math.min(120, v) })} />
    <ActionButton label="生产 ×60：每 10 秒成熟" onClick={() => change({ husbandryProductionSpeed: 60 })} />
    <ActionButton label="恢复驯养 GM 默认值" onClick={() => change({ wolfEscapeChance: 0.95, bearEscapeChance: 0.99, husbandryDecaySpeed: 1, husbandryProductionSpeed: 1 })} />
    <div style={{ fontSize: 12, lineHeight: 1.7 }}>在草地生成并套住动物，停止挣扎后从背包丢食物。倍率 0 暂停对应计时；进食仍每 5 秒一份。生产加速只影响成年驯养羊、牛，不加速幼崽成长。设置全房间共享，由房主结算，不写入存档。0% 仍需等五次挣扎结束。</div>
  </div>;
}
