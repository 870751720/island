'use client';

import { useEffect, useState } from 'react';
import type { Game } from '@/game/Game';
import { DOG_STAGES, type DogGmCommand } from '@/game/systems/DogGrowth';
import { dogFood, DOG_FOODS } from '@/game/systems/DogFood';
import { FOODS } from '@/game/systems/Food';
import { ActionButton } from './controls';
import { gameTheme } from '../gameTheme';

export function DogTab({ getGame }: { getGame: () => Game | null }) {
  const [state, setState] = useState(() => getGame()?.getDogDebugState());
  const [kind, setKind] = useState('cookedGameMeat');
  useEffect(() => {
    const timer = window.setInterval(() => setState(getGame()?.getDogDebugState()), 300);
    return () => window.clearInterval(timer);
  }, [getGame]);
  const run = (command: DogGmCommand, value = 0) => getGame()?.gmDog(command, value);
  const next = DOG_STAGES.find(s => s.stage === (state?.stage ?? 1) + 1);
  const selected = FOODS.find(f => f.kind === kind)!;
  const rejection = dogFood(selected.kind) ? undefined : '薯条不吃这种食物';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, color: gameTheme.ink }}>
      <div style={{ padding: 10, background: gameTheme.inset, borderRadius: 12, fontSize: 13, lineHeight: 1.7 }}>
        <strong>{state?.stage ?? 1} 阶段 · {DOG_STAGES[(state?.stage ?? 1) - 1].name} · 无敌</strong>
        <div>攻击力 {state?.stage ?? 1} · 总经验 {state?.xp ?? 0}{next ? ` / ${next.xp}` : '（满阶段）'}</div>
        <div>喂食冷却 {Math.ceil(state?.eatCooldown ?? 0)} 秒 · 护主奖励冷却 {Math.ceil(state?.protectCooldown ?? 0)} 秒</div>
        <div>陪伴计时 {Math.floor(state?.companionSeconds ?? 0)} / 60 秒</div>
        <div>{DOG_STAGES[(state?.stage ?? 1) - 1].skill}</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {DOG_STAGES.map(s => <ActionButton key={s.stage} label={`${s.stage} 阶段`} onClick={() => run('stage', s.stage)} />)}
      </div>
      <ActionButton label="增加 30 经验" onClick={() => run('xp', 30)} />
      {next && <ActionButton label="设到下阶段前 1 经验" onClick={() => run('xp', next.xp - (state?.xp ?? 0) - 1)} />}
      <div style={{ display: 'flex', gap: 6 }}>
        <ActionButton label="模拟陪伴 60 秒" onClick={() => run('companion')} />
        <ActionButton label="模拟护主成功" onClick={() => run('protect')} />
      </div>
      <ActionButton label="清除喂食、攻击和奖励冷却" onClick={() => run('cooldowns')} />
      <ActionButton label="召回身旁并跟随我" onClick={() => run('recall')} />
      <ActionButton label="放下喂食与拒食对照组" onClick={() => run('foods')} />
      <div style={{ fontSize: 12 }}>3 份烤兽肉 + 辣椒、酒、生肉；落地 4 秒后应只少 1 份烤肉，经验 +30。</div>
      <label style={{ fontSize: 13 }}>
        食物逐项测试（可喂 {DOG_FOODS.length} 种）
        <select aria-label="薯条测试食物" value={kind} onChange={e => setKind(e.target.value)}
          style={{ width: '100%', minHeight: 44, marginTop: 5, color: gameTheme.ink, background: gameTheme.inset, borderRadius: 8 }}>
          {FOODS.map(f => <option key={f.kind} value={f.kind}>{f.name} · {!dogFood(f.kind) ? '拒食' : `+${f.hunger}经验`}</option>)}
        </select>
      </label>
      <div style={{ fontSize: 12 }}>{rejection ?? `可喂，每份增加 ${selected.hunger} 经验；从背包丢弃喂食。`}</div>
      <ActionButton label="领取所选食物 ×3" onClick={() => getGame()?.gmGiveItem(selected.kind, 3)} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <ActionButton label="警觉表情" onClick={() => run('emojiAlert')} />
        <ActionButton label="扑咬表情" onClick={() => run('emojiBite')} />
        <ActionButton label="护主表情" onClick={() => run('emojiGuard')} />
      </div>
      <ActionButton label="护主实战：生成 5 血狼" onClick={() => run('threat')} tone="primary" />
      <ActionButton label="五阶段救场：30 血 + 15 血狼" onClick={() => run('rescue')} />
      <div style={{ fontSize: 12, lineHeight: 1.6 }}>在草地测试，关闭面板查看扑咬和头顶升级提示。救场测试先关闭玩家无敌；护主命中后消灭敌人或脱战 6 秒，经验 +12，每 60 秒最多一次。联机操作由房主结算。</div>
    </div>
  );
}
