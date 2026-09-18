'use client';

import { ANIMAL_LABELS, type AnimalSpecies } from '@/game/entities/Wildlife';
import { ActionButton } from './controls';

/** 生成档:物种与是否幼崽;小绵羊/小野牛用于驯养与护崽行为调试 */
const SPAWNS: { species: AnimalSpecies; juvenile: boolean; label: string }[] = [
  { species: 'rabbit', juvenile: false, label: ANIMAL_LABELS.rabbit },
  { species: 'sheep', juvenile: false, label: ANIMAL_LABELS.sheep },
  { species: 'sheep', juvenile: true, label: '小绵羊' },
  { species: 'bison', juvenile: false, label: ANIMAL_LABELS.bison },
  { species: 'bison', juvenile: true, label: '小野牛' },
  { species: 'wolf', juvenile: false, label: ANIMAL_LABELS.wolf },
  { species: 'bear', juvenile: false, label: ANIMAL_LABELS.bear },
  { species: 'crocodile', juvenile: false, label: ANIMAL_LABELS.crocodile },
];

/** 动物 tab:在玩家附近生成指定动物(战斗/狩猎/驯养调试用) */
export function AnimalsTab({ onSpawn }: { onSpawn: (species: AnimalSpecies, juvenile?: boolean) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 13, color: '#8a7a5a', padding: '0 4px' }}>在附近草地生成动物</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {SPAWNS.map((s) => (
          <ActionButton key={s.label} label={s.label} onClick={() => onSpawn(s.species, s.juvenile)} />
        ))}
      </div>
    </div>
  );
}
