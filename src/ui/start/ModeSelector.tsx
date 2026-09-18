import { GAME_MODE_LABELS, type GameMode } from '@/game/GameMode';
import { SegmentedRow } from './SegmentedRow';

export function ModeSelector({ value, onChange, disabled = false }: {
  value: GameMode; onChange: (mode: GameMode) => void; disabled?: boolean;
}) {
  return <SegmentedRow label="游戏模式" value={value} onChange={onChange} disabled={disabled}
    options={(['leisure', 'survival'] as const).map(mode => ({ value: mode, content: GAME_MODE_LABELS[mode] }))} />;
}
