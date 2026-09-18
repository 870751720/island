import type { ReactNode } from 'react';

/** 左标签 + 右胶囊选项的分段选择行，游戏模式与同行伙伴共用同一套样式。 */
export function SegmentedRow<T extends string>({ label, options, value, onChange, disabled = false }: {
  label: string;
  options: readonly { value: T; content: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return <div className="segment-row">
    <style>{segmentedRowCss}</style>
    <span className="segment-label">{label}</span>
    <div className="segment-options" role="group" aria-label={label}>
      {options.map(option => <button key={option.value} type="button"
        disabled={disabled} className="segment-option" aria-pressed={value === option.value}
        onClick={() => onChange(option.value)}>{option.content}</button>)}
    </div>
  </div>;
}

const segmentedRowCss = `
.segment-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:0 2px 12px}
.segment-label{font-size:11px;color:#718175}.segment-options{display:flex;padding:3px;border-radius:24px;background:#718c8210}
.segment-option{display:inline-flex;align-items:center;justify-content:center;gap:7px;font:inherit;cursor:pointer;touch-action:manipulation;border:0;border-radius:20px;min-width:68px;min-height:44px;padding:0 17px;background:transparent;color:#7c8980;font-size:12px!important}
.segment-option[aria-pressed=true]{background:#fffdf0;color:#496e87;box-shadow:0 1px 4px #4b675f18;font-weight:700}
.segment-option:focus-visible{outline:2px solid #496e87;outline-offset:2px}.segment-option:disabled{cursor:default;opacity:.65}
.segment-icon{width:24px;height:24px;flex-shrink:0}
`;
