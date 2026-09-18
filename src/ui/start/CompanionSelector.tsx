import { COMPANIONS, type CompanionKind } from '@/game/companions/CompanionDefinition';
import { COLA_ICON } from '../icons/ColaIcon';
import { DOG_EMOJI_SVG } from '../icons/DogEmojiIcons';
import { SegmentedRow } from './SegmentedRow';

export function CompanionSelector({ value, onChange, disabled = false }: {
  value: CompanionKind; onChange: (kind: CompanionKind) => void; disabled?: boolean;
}) {
  return <SegmentedRow label="同行伙伴" value={value} onChange={onChange} disabled={disabled}
    options={(['dog', 'cat'] as const).map(kind => ({ value: kind, content: <>
      <span className="segment-icon" aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: kind === 'cat' ? COLA_ICON : DOG_EMOJI_SVG['dog-companion'] }} />
      {COMPANIONS[kind].name}
    </> }))} />;
}
