'use client';

import { useState } from 'react';
import type { Game } from '@/game/Game';
import { LANDMARKS, type LandmarkChoice } from '@/game/world/landmarks/LandmarkDefinitions';
import { gameTheme } from '../gameTheme';
import { ActionButton, SelectRow } from './controls';

export function LandmarkControls({ getGame }: { getGame: () => Game | null }) {
  const [choice, setChoice] = useState<LandmarkChoice>('random');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 14, color: gameTheme.ink }}>遗迹与村落</div>
      <SelectRow
        ariaLabel="生成地点类型"
        value={choice}
        onChange={setChoice}
        options={[
          { value: 'random' as LandmarkChoice, label: '按权重随机' },
          ...LANDMARKS.map((d) => ({ value: d.kind, label: `${d.name} · 权重 ${d.weight}` })),
        ]}
      />
      <ActionButton label="立即在我附近生成" onClick={() => getGame()?.gmSpawnLandmark(choice)} />
    </div>
  );
}
