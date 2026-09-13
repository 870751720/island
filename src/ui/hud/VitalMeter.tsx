import { HudIcon, type HudIconName } from './HudIcon';

type VitalKind = Extract<HudIconName, 'health' | 'hunger' | 'thirst'>;
const LABELS = { health: '生命', hunger: '饱食', thirst: '水分' };
const WARNINGS = { health: '危险', hunger: '饥饿', thirst: '缺水' };

/** 读取快照中的 0–100 状态；CSS 负责过渡，不增加逐帧 React 更新。 */
export function VitalMeter({ kind, value, onIconTap }: { kind: VitalKind; value: number; onIconTap?: () => void }) {
  const level = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const low = level <= 20;
  return (
    <div className={`hud-vital hud-vital--${kind}${low ? ' is-low' : ''}`}>
      {onIconTap
        ? <button className="hud-vital-icon" onClick={onIconTap} aria-label="生命状态"><HudIcon name={kind} size={19} /></button>
        : <span className="hud-vital-icon"><HudIcon name={kind} size={17} /></span>}
      <div className="hud-vital-body">
        <div className="hud-vital-caption"><span>{LABELS[kind]}</span>{low && <span className="hud-vital-warning">{WARNINGS[kind]}</span>}</div>
        <div className="hud-meter" role="meter" aria-label={LABELS[kind]} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level)} aria-valuetext={`${Math.round(level)}%${low ? `，${WARNINGS[kind]}` : ''}`}>
          <span className="hud-meter-trail" style={{ transform: `scaleX(${level / 100})` }} />
          <span className="hud-meter-fill" style={{ transform: `scaleX(${level / 100})` }} />
          <span className="hud-meter-ticks" />
        </div>
      </div>
    </div>
  );
}
