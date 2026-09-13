import { useId } from 'react';
import { BottleCanvas, type BottleLevels } from './BottleCanvas';

const BOTTLE_PATH = 'M17 10H27V17Q33 22 33 28V36Q33 45 22 45Q11 45 11 36V28Q11 22 17 17Z';
const BOTTLES = [
  { label: '生命', warning: '危险', color: '#e94659' },
  { label: '饱食', warning: '饥饿', color: '#eaaa29' },
  { label: '水分', warning: '缺水', color: '#35b5dd' },
] as const;

/** 瓶身本身就是状态容器；SVG 同时提供 WebGL 不可用时的液位回退。 */
export function VitalBottles({ health, hunger, thirst, onHeartTap }: { health: number; hunger: number; thirst: number; onHeartTap: () => void }) {
  const id = useId().replace(/:/g, '');
  const normalize = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)) / 100;
  const levels: BottleLevels = [normalize(health), normalize(hunger), normalize(thirst)];
  return (
    <div className="hud-bottles">
      <BottleCanvas levels={levels} />
      {BOTTLES.map((bottle, index) => {
        const level = levels[index];
        const low = level <= 0.2;
        return <div className={`hud-bottle${low ? ' is-low' : ''}`} key={bottle.label}>
          <div className="hud-bottle-meter" role="meter" aria-label={bottle.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)} aria-valuetext={`${Math.round(level * 100)}%${low ? `，${bottle.warning}` : ''}`}>
            <svg className="hud-bottle-fallback" viewBox="0 0 44 48" aria-hidden="true">
              <defs><clipPath id={`${id}-${index}`}><path d={BOTTLE_PATH} /></clipPath></defs>
              <path d={BOTTLE_PATH} fill="#f4fae977" />
              <g clipPath={`url(#${id}-${index})`}><rect x="6" y={45 - level * 33} width="32" height={level * 33} fill={bottle.color} /></g>
              <path d={BOTTLE_PATH} fill="none" stroke="#749790" strokeWidth="1.5" />
              <path d="M14 25v9" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".8" />
              <rect x="16" y="5" width="12" height="7" rx="2" fill="#c8a16a" /><path d="M15 13h14" stroke="#e5edd4" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          {index === 0 && <button className="hud-bottle-tap" aria-label="生命状态" onClick={onHeartTap} />}
          <span className="hud-bottle-label">{low ? bottle.warning : bottle.label}</span>
        </div>;
      })}
    </div>
  );
}
