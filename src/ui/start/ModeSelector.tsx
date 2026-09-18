import { GAME_MODE_LABELS, type GameMode } from '@/game/GameMode';
import { SegmentedRow } from './SegmentedRow';

export function ModeSelector({ value, onChange, disabled = false }: {
  value: GameMode; onChange: (mode: GameMode) => void; disabled?: boolean;
}) {
  return <>
    <style>{modeSelectorCss}</style>
    <SegmentedRow ariaLabel="游戏模式" value={value} onChange={onChange} disabled={disabled}
      lead={<div className="mode-tags" aria-live="polite">
        {MODE_TAGS[value].map(tag => <span key={tag.text} className={`mode-tag ${tag.className}`}>{tag.text}</span>)}
      </div>}
      options={(['leisure', 'survival'] as const).map(mode => ({ value: mode, content: GAME_MODE_LABELS[mode] }))} />
  </>;
}

const MODE_TAGS: Record<GameMode, readonly { text: string; className: string }[]> = {
  leisure: [{ text: '死亡可复活', className: 'tag-revive' }, { text: '无传承点', className: 'tag-no-legacy' }],
  survival: [{ text: '不可复活', className: 'tag-no-revive' }, { text: '有传承点', className: 'tag-legacy' }],
};

const modeSelectorCss = `
.mode-tags{display:flex;gap:5px;min-width:0;flex-wrap:wrap}
.mode-tag{font-size:10px;line-height:1;padding:5px 8px;border-radius:999px}
.tag-revive{color:#4c7a52;background:#8fbf9b2e}
.tag-no-legacy{color:#79826f;background:#9aa39426}
.tag-no-revive{color:#ad4f43;background:#d0978c2b}
.tag-legacy{color:#8f6f24;background:#d8b75c30}
`;
