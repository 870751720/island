'use client';

import { useState } from 'react';
import type { Game } from '@/game/Game';
import { GmSystem, type GmConfig } from '@/game/systems/GmSystem';
import { LANDMARKS, validLandmarkChances, type LandmarkChoice } from '@/game/world/landmarks/LandmarkDefinitions';
import { DEFAULT_LANDMARK_CHANCES } from '@/game/world/landmarks/LandmarkSettings';
import { gameTheme, gameButtonStyle } from '../gameTheme';
import { ActionButton } from './controls';

export function LandmarkControls({ getGame, onSetConfig }: {
  getGame: () => Game | null; onSetConfig: (patch: Partial<GmConfig>) => void;
}) {
  const [choice, setChoice] = useState<LandmarkChoice>('random');
  const [chances, setChances] = useState(GmSystem.landmarkChances.map(String));
  const [message, setMessage] = useState('');
  const values = chances.map(Number);
  const valid = chances.every(v => v.trim() !== '') && validLandmarkChances(values);
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ fontSize: 14, color: gameTheme.ink }}>遗迹与村落</div>
    <select aria-label="生成地点类型" value={choice} onChange={e => setChoice(e.target.value as LandmarkChoice)} style={inputStyle}>
      <option value="random">按权重随机</option>
      {LANDMARKS.map(d => <option key={d.kind} value={d.kind}>{d.name} · 权重 {d.weight}</option>)}
    </select>
    <ActionButton label="立即在我附近生成" onClick={() => getGame()?.gmSpawnLandmark(choice)} />
    <div style={{ fontSize: 12, color: gameTheme.muted }}>新岛生成概率（互斥，保存后下次新开局生效）</div>
    <div style={{ display: 'flex', gap: 6 }}>
      {chances.map((value, i) => <label key={i} style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
        {i + 1} 处（%）
        <input aria-label={`生成${i + 1}处概率`} type="number" inputMode="decimal" min={0} max={100} step="0.1"
          value={value} onChange={e => { setChances(chances.map((v, j) => j === i ? e.target.value : v)); setMessage(''); }}
          style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginTop: 4 }} />
      </label>)}
    </div>
    <div style={{ fontSize: 12, color: gameTheme.muted }}>
      {valid ? `不生成：${Number((100 - values.reduce((a, b) => a + b, 0)).toFixed(2))}%` : '各项须为 0～100，总和不能超过 100%。'}
    </div>
    <div style={{ display: 'flex', gap: 6 }}>
      <ActionButton label="保存概率" onClick={() => {
        if (!valid) { setMessage('请先填写有效概率'); return; }
        onSetConfig({ landmarkChances: values }); setMessage('已保存，下次新开局生效；旧档不补刷');
      }} />
      <ActionButton label="恢复默认" onClick={() => {
        setChances(DEFAULT_LANDMARK_CHANCES.map(String));
        onSetConfig({ landmarkChances: [...DEFAULT_LANDMARK_CHANCES] }); setMessage('已恢复 35% / 10% / 1%');
      }} />
    </div>
    {message && <div role="status" style={{ fontSize: 12, color: gameTheme.ink }}>{message}</div>}
  </div>;
}

const inputStyle = { ...gameButtonStyle, minHeight: 44, minWidth: 0, padding: '8px', borderRadius: 10,
  background: gameTheme.inset, color: gameTheme.ink, fontFamily: gameTheme.font, fontSize: 14 } as const;
