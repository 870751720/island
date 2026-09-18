'use client';

import { useEffect, useState } from 'react';
import type { Game } from '@/game/Game';
import { DOG_STAGES, type DogGmCommand } from '@/game/systems/DogGrowth';
import { animalFood } from '@/game/systems/AnimalFood';
import { CAT_STAGES, COMPANIONS } from '@/game/companions/CompanionDefinition';
import { FOODS } from '@/game/systems/Food';
import { ActionButton, SelectRow } from './controls';
import { gameTheme } from '../gameTheme';

export function DogTab({ getGame }: { getGame: () => Game | null }) {
  const [state, setState] = useState(() => getGame()?.getDogDebugState());
  const [kind, setKind] = useState('cookedGameMeat');
  useEffect(() => {
    const timer = window.setInterval(() => setState(getGame()?.getDogDebugState()), 300);
    return () => window.clearInterval(timer);
  }, [getGame]);
  const run = (command: DogGmCommand, value = 0) => getGame()?.gmDog(command, value);
  const petKind = state?.kind ?? 'dog';
  const cat = petKind === 'cat';
  const name = COMPANIONS[petKind].name;
  const stages = cat ? CAT_STAGES : DOG_STAGES;
  const edible = (kind: typeof FOODS[number]['kind']) => animalFood(kind, petKind);
  const next = stages.find(s => s.stage === (state?.stage ?? 1) + 1);
  const selected = FOODS.find(f => f.kind === kind)!;
  const rejection = edible(selected.kind) ? undefined : `${name}不吃这种食物`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, color: gameTheme.ink }}>
      <div style={{ padding: 10, background: gameTheme.inset, borderRadius: 12, fontSize: 13, lineHeight: 1.7 }}>
        <strong>{state?.stage ?? 1} 阶段 · {stages[(state?.stage ?? 1) - 1].name} · 无敌</strong>
        <div>{cat ? '不参与战斗' : `攻击力 ${state?.stage ?? 1}`} · 总经验 {state?.xp ?? 0}{next ? ` / ${next.xp}` : '（满阶段）'}</div>
        <div>喂食冷却 {Math.ceil(state?.eatCooldown ?? 0)} 秒 · {cat ? '发掘冷却' : '护主奖励冷却'} {Math.ceil((cat ? state?.forageCooldown : state?.protectCooldown) ?? 0)} 秒</div>
        <div>陪伴计时 {Math.floor(state?.companionSeconds ?? 0)} / 60 秒</div>
        <div>{stages[(state?.stage ?? 1) - 1].skill}</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {stages.map(s => <ActionButton key={s.stage} label={`${s.stage} 阶段`} onClick={() => run('stage', s.stage)} />)}
      </div>
      <ActionButton label="增加 30 经验" onClick={() => run('xp', 30)} />
      {next && <ActionButton label="设到下阶段前 1 经验" onClick={() => run('xp', next.xp - (state?.xp ?? 0) - 1)} />}
      <div style={{ display: 'flex', gap: 6 }}>
        <ActionButton label="模拟陪伴 60 秒" onClick={() => run('companion')} />
        {!cat && <ActionButton label="模拟护主成功" onClick={() => run('protect')} />}
      </div>
      {cat && <ActionButton label="召回并准备发掘" onClick={() => { run('recall'); run('cooldowns'); }} />}
      <ActionButton label="清除伙伴冷却" onClick={() => run('cooldowns')} />
      <ActionButton label="召回身旁并跟随我" onClick={() => run('recall')} />
      <ActionButton label="放下喂食与拒食对照组" onClick={() => run('foods')} />
      <div style={{ fontSize: 12 }}>3 份烤兽肉 + 辣椒、酒、生肉；落地 4 秒后应只少 1 份烤肉，经验 +30。</div>
      <div style={{ fontSize: 13 }}>食物逐项测试（可喂 {FOODS.filter(f => edible(f.kind)).length} 种）</div>
      <SelectRow
        ariaLabel={`${name}测试食物`}
        value={kind}
        onChange={setKind}
        options={FOODS.map(f => ({ value: f.kind, label: `${f.name} · ${!edible(f.kind) ? '拒食' : `+${f.hunger}经验`}` }))}
      />
      <div style={{ fontSize: 12 }}>{rejection ?? `可喂，每份增加 ${selected.hunger} 经验；从背包丢弃喂食。`}</div>
      <ActionButton label="领取所选食物 ×3" onClick={() => getGame()?.gmGiveItem(selected.kind, 3)} />
      {!cat && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <ActionButton label="警觉表情" onClick={() => run('emojiAlert')} />
        <ActionButton label="扑咬表情" onClick={() => run('emojiBite')} />
        <ActionButton label="护主表情" onClick={() => run('emojiGuard')} />
      </div>}
      <ActionButton label={cat ? '避战测试：生成 5 血狼' : '护主实战：生成 5 血狼'} onClick={() => run('threat')} tone="primary" />
      {!cat && <ActionButton label="五阶段救场：30 血 + 15 血狼" onClick={() => run('rescue')} />}
      <div style={{ fontSize: 12, lineHeight: 1.6 }}>{cat ? '在干地召回后观察寻点、扒拉三秒和食物入包；成功发掘 +6 经验。用不同阶段测试食物池，填满背包测试落地；生成狼测试中断发掘与避战。联机操作由房主结算。' : '在草地测试，关闭面板查看扑咬和头顶升级提示。救场测试先关闭玩家无敌；护主命中后消灭敌人或脱战 6 秒，经验 +12，每 60 秒最多一次。联机操作由房主结算。'}</div>
    </div>
  );
}
