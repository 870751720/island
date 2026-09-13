import { useState, type CSSProperties } from 'react';
import type { HudSnapshot } from '@/game/GameContracts';
import type { HudBuff } from '@/game/systems/BuffSystem';
import { VitalMeter } from './hud/VitalMeter';

const SEASONS = {
  spring: { label: '春日', color: '#b5d8a0' },
  summer: { label: '盛夏', color: '#f5cf7c' },
  autumn: { label: '金秋', color: '#eaaa78' },
  winter: { label: '寒冬', color: '#a7d8ec' },
} as const;

/** 本地玩家状态条与增益区；为展开的小地图预留宽度。 */
export function Hud({ hud, onHeartTap, rightReserve }: {
  hud: HudSnapshot;
  onHeartTap: () => void;
  rightReserve: number;
}) {
  const [tip, setTip] = useState<{ buff: HudBuff; x: number; y: number } | null>(null);
  const season = SEASONS[hud.season];
  return (
    <div className="hud-status" style={{ '--hud-right-reserve': `${rightReserve}px` } as CSSProperties}>
      <div className="hud-status-card">
        <div className="hud-day"><span>第 <strong>{hud.day}</strong> 天</span><span className="hud-season" style={{ '--season-color': season.color } as CSSProperties}>{season.label}</span></div>
        <VitalMeter kind="health" value={hud.health} onIconTap={onHeartTap} />
        <VitalMeter kind="hunger" value={hud.hunger} />
        <VitalMeter kind="thirst" value={hud.thirst} />
      </div>
      {hud.buffs.length > 0 && (
        <div className="hud-buffs" aria-label="当前状态效果">
          {hud.buffs.map((buff) => (
            <button key={buff.id} className={`hud-buff${buff.good ? '' : ' is-bad'}`} aria-label={`${buff.name}，${buff.good ? '增益' : '减益'}`} aria-expanded={tip?.buff.id === buff.id}
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setTip(tip?.buff.id === buff.id ? null : { buff, x: rect.left + rect.width / 2, y: rect.bottom });
              }}>
              {buff.icon}
              {buff.remain !== null && <span className="hud-buff-time">{buff.remain}</span>}
            </button>
          ))}
        </div>
      )}
      {tip && (
        <>
          <div
            onPointerDown={(e) => {
              e.preventDefault();
              setTip(null);
            }}
            style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'auto' }}
          />
          <div
            style={{
              position: 'fixed',
              pointerEvents: 'auto',
              left: Math.min(Math.max(tip.x - 115, 10), window.innerWidth - 240),
              top: tip.y + 8,
              width: 230,
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.98)',
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.1)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              fontFamily: 'sans-serif',
              fontSize: 13,
              color: '#333',
              lineHeight: 1.5,
              zIndex: 61,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{tip.buff.icon}</span>
              <span style={{ fontWeight: 700, flex: 1 }}>{tip.buff.name}</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: tip.buff.good ? '#4caf50' : '#c0392d',
                }}
              >
                {tip.buff.good ? '增益' : '减益'}
              </span>
            </div>
            <div style={{ marginTop: 4 }}>{tip.buff.description}</div>
          </div>
        </>
      )}
    </div>
  );
}
