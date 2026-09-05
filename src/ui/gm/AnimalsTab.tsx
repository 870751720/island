'use client';

import { ANIMAL_LABELS, type AnimalSpecies } from '@/game/entities/Wildlife';
import { ActionButton } from './controls';

/** 动物 tab:在玩家附近生成指定动物(战斗/狩猎调试用) */
export function AnimalsTab({ onSpawn }: { onSpawn: (species: AnimalSpecies) => void }) {
  const species: AnimalSpecies[] = ['rabbit', 'sheep', 'deer', 'wolf', 'bear'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 13, color: '#8a7a5a', padding: '0 4px' }}>在附近草地生成动物</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {species.map((s) => (
          <ActionButton key={s} label={ANIMAL_LABELS[s]} onClick={() => onSpawn(s)} />
        ))}
      </div>
    </div>
  );
}
