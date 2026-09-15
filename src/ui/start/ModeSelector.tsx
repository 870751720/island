import { GAME_MODE_LABELS, type GameMode } from '@/game/GameMode';

export function ModeSelector({ value, onChange, disabled = false }: {
  value: GameMode;
  onChange: (mode: GameMode) => void;
  disabled?: boolean;
}) {
  return <div className="mode-row">
    <style>{modeSelectorCss}</style>
    <span className="mode-label">游戏模式</span>
    <div className="mode-options" role="group" aria-label="游戏模式">
      {(['leisure', 'survival'] as const).map(mode => <button key={mode} type="button"
        disabled={disabled} className="mode-option" aria-pressed={value === mode}
        onClick={() => onChange(mode)}>{GAME_MODE_LABELS[mode]}</button>)}
    </div>
  </div>;
}

const modeSelectorCss = `
.mode-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:0 2px 12px}
.mode-label{font-size:11px;color:#718175}.mode-options{display:flex;padding:3px;border-radius:24px;background:#718c8210}
.mode-option{font:inherit;cursor:pointer;touch-action:manipulation;border:0;border-radius:20px;min-width:68px;min-height:44px;padding:0 17px;background:transparent;color:#7c8980;font-size:12px!important}
.mode-option[aria-pressed=true]{background:#fffdf0;color:#496e87;box-shadow:0 1px 4px #4b675f18;font-weight:700}
.mode-option:focus-visible{outline:2px solid #496e87;outline-offset:2px}.mode-option:disabled{cursor:default;opacity:.65}
`;
