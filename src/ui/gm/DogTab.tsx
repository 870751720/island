'use client';

import { useEffect, useState } from 'react';
import type { Game } from '@/game/Game';
import { DOG_STAGES, type DogGmCommand } from '@/game/systems/DogGrowth';
import { CAT_STAGES, COMPANIONS } from '@/game/companions/CompanionDefinition';
import { ActionButton } from './controls';
import { gameTheme } from '../gameTheme';

export function DogTab({ getGame }: { getGame: () => Game | null }) {
  const [state, setState] = useState(() => getGame()?.getDogDebugState());
  useEffect(() => {
    const timer = window.setInterval(() => setState(getGame()?.getDogDebugState()), 300);
    return () => window.clearInterval(timer);
  }, [getGame]);
  const run = (command: DogGmCommand, value = 0) => getGame()?.gmDog(command, value);
  const petKind = state?.kind ?? 'dog';
  const cat = petKind === 'cat';
  const name = COMPANIONS[petKind].name;
  const stages = cat ? CAT_STAGES : DOG_STAGES;
  const next = stages.find(s => s.stage === (state?.stage ?? 1) + 1);
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
      {!cat && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <ActionButton label="警觉表情" onClick={() => run('emojiAlert')} />
        <ActionButton label="扑咬表情" onClick={() => run('emojiBite')} />
        <ActionButton label="护主表情" onClick={() => run('emojiGuard')} />
      </div>}
      {!cat && <ActionButton label="五阶段救场：30 血 + 15 血狼" onClick={() => run('rescue')} tone="primary" />}
    </div>
  );
}
