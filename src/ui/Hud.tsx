import { gameViewportSize } from '@/platform/displayCoordinates';
import { QuestPanel } from './QuestPanel';
import { gameTheme } from './gameTheme';
import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';
import { BuffInputDiagnostics } from './diagnostics/BuffInputDiagnostics';
import { traceBuff, traceBuffState } from './diagnostics/buffInputTrace';
import { fadeStyle } from './fade';
import { useHudInteraction } from './useHudInteraction';
import type { HudSnapshot } from '@/game/GameContracts';
import { StatusIcon, BUFF_SVG } from './icons/StatusIcons';
import type { HudBuff } from '@/game/systems/BuffSystem';
import { VitalBottles } from './hud/VitalBottles';
import { BuffButton } from './hud/BuffButton';
import { DayPhaseIcon } from './icons/DayPhaseIcon';

const SEASONS = {
  spring: { label: '春日', color: '#b5d8a0' },
  summer: { label: '盛夏', color: '#f5cf7c' },
  autumn: { label: '金秋', color: '#eaaa78' },
  winter: { label: '寒冬', color: '#a7d8ec' },
} as const;

/** 本地玩家状态瓶与增益区；为展开的小地图预留宽度。 */
export function Hud({ hud, rightReserve, onQuestNavigate, idleHidden = false }: {
  hud: HudSnapshot;
  onQuestNavigate: () => void;
  rightReserve: number;
  idleHidden?: boolean;
}) {
  const [tip, setTip] = useState<{ buff: HudBuff; x: number; y: number } | null>(null);
  const { hidden, interact } = useHudInteraction(idleHidden, !!tip);
  useLayoutEffect(() => {
    traceBuffState({ idleHidden, hidden, busy: hud.busy, dead: hud.dead, tip: tip?.buff.id ?? null });
  }, [idleHidden, hidden, hud.busy, hud.dead, tip]);
  useEffect(() => {
    if (hud.dead) { traceBuff('close-death'); setTip(null); }
  }, [hud.dead]);
  const season = SEASONS[hud.season];
  return (
    <>
    <BuffInputDiagnostics />
    <div className="hud-status hud-top-edge" inert={hidden} aria-hidden={hidden}
      onPointerDownCapture={interact} onClickCapture={interact}
      style={{ ...fadeStyle(hidden), pointerEvents: 'none', '--hud-right-reserve': `${rightReserve}px` } as CSSProperties}>
      <div className="hud-status-stack">
      <div className="hud-status-card">
      <VitalBottles health={hud.health} hunger={hud.hunger} thirst={hud.thirst} />
      <div className="hud-day">
        <span>第 <strong>{hud.day}</strong> 天</span>
        <span className="hud-season" style={{ '--season-color': season.color } as CSSProperties}>
          {season.label}<DayPhaseIcon phase={hud.phase} />
        </span>
      </div>
      </div>
      {!hud.dead && <QuestPanel quest={hud.quests} onNavigate={onQuestNavigate} />}
      </div>
      {hud.buffs.length > 0 && (
        <div className="hud-buffs" aria-label="当前状态效果" onScroll={(event) => { traceBuff('close-scroll', { scrollTop: event.currentTarget.scrollTop }); interact(); setTip(null); }}>
          {hud.buffs.map((buff) => (
            <BuffButton key={buff.id} buff={buff} expanded={tip?.buff.id === buff.id} disabled={hidden || hud.dead}
              onActivate={(rect) => {
                traceBuff('tip-toggle-request', { id: buff.id, previous: tip?.buff.id ?? null });
                interact();
                setTip(current => current?.buff.id === buff.id ? null : { buff, x: rect.left + rect.width / 2, y: rect.bottom });
              }} />
          ))}
        </div>
      )}
    </div>
      {tip && !hud.dead && (
        <>
          <div
            onPointerDown={(e) => {
              e.preventDefault();
              traceBuff('close-backdrop');
              interact();
              setTip(null);
            }}
            style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'auto' }}
          />
          <div
            data-buff-tip
            style={{
              position: 'fixed',
              pointerEvents: 'auto',
              left: Math.min(Math.max(tip.x - 115, 10), gameViewportSize().width - 240),
              top: tip.y + 8,
              width: 230,
              padding: '10px 12px',
              background: gameTheme.panel,
              borderRadius: 12,
              border: gameTheme.border,
              boxShadow: gameTheme.shadow,
              fontFamily: 'sans-serif',
              fontSize: 13,
              color: gameTheme.ink,
              lineHeight: 1.5,
              zIndex: 61,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StatusIcon markup={BUFF_SVG[tip.buff.id]} size={24} />
              <span style={{ fontWeight: 700, flex: 1 }}>{tip.buff.name}{tip.buff.stacks !== undefined ? ` · ${tip.buff.stacks} 层` : ''}</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: tip.buff.good ? gameTheme.accent : gameTheme.danger,
                }}
              >
                {tip.buff.good ? '增益' : '减益'}
              </span>
            </div>
            <div style={{ marginTop: 4 }}>{tip.buff.description}</div>
          </div>
        </>
      )}
    </>
  );
}
