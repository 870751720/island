import { COMPANIONS, type CompanionKind } from '@/game/companions/CompanionDefinition';
import { COLA_ICON } from '../icons/ColaIcon';
import { DOG_EMOJI_SVG } from '../icons/DogEmojiIcons';

export function CompanionSelector({ value, onChange, disabled = false }: {
  value: CompanionKind; onChange: (kind: CompanionKind) => void; disabled?: boolean;
}) {
  return <fieldset style={{ border: 0, padding: 0, margin: '16px 0', minWidth: 0 }} disabled={disabled}>
    <legend style={{ fontSize: 13, marginBottom: 8 }}>选一位同行伙伴</legend>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
      {(['dog', 'cat'] as const).map(kind => <button key={kind} type="button" aria-pressed={value === kind}
        onClick={() => onChange(kind)} style={{ minHeight: 100, padding: '10px 8px', borderRadius: 12, border: `2px solid ${value === kind ? '#718c59' : '#d9d8c5'}`, background: value === kind ? '#edf1df' : '#fffaf0', color: '#394431', cursor: 'pointer' }}>
        <span aria-hidden="true" style={{ width: 40, height: 40, display: 'inline-block', verticalAlign: 'middle', marginRight: 5 }} dangerouslySetInnerHTML={{ __html: kind === 'cat' ? COLA_ICON : DOG_EMOJI_SVG['dog-companion'] }} />
        <strong>{COMPANIONS[kind].name}</strong>
        <span style={{ display: 'block', fontSize: 11, lineHeight: 1.6, marginTop: 5 }}>{COMPANIONS[kind].description}</span>
      </button>)}
    </div>
    <p style={{ fontSize: 11, margin: '8px 0 0', lineHeight: 1.6 }}>伙伴陪伴整座岛，本局选定后不更换；联机时全队共享。</p>
  </fieldset>;
}
