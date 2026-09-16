import { playUiSound } from '@/game/audio/UiAudio';
import type { HudBuff } from '@/game/systems/BuffSystem';
import { StatusIcon, BUFF_SVG } from '../icons/StatusIcons';
import { traceBuff } from '../diagnostics/buffInputTrace';

/** 图标按下即显示详情；不阻止默认手势，让列表保留原生滚动。 */
export function BuffButton({ buff, expanded, disabled, onActivate }: {
  buff: HudBuff;
  expanded: boolean;
  disabled: boolean;
  onActivate: (rect: DOMRect) => void;
}) {
  const activate = (button: HTMLButtonElement) => {
    traceBuff('activate', { id: buff.id, disabled, expanded });
    if (disabled) return;
    onActivate(button.getBoundingClientRect());
    playUiSound('click', 'game');
  };
  return (
    <button
      type="button"
      className={`hud-buff${buff.good ? '' : ' is-bad'}`}
      data-ui-sound="manual"
      data-buff-id={buff.id}
      aria-label={`${buff.name}，${buff.good ? '增益' : '减益'}`}
      aria-expanded={expanded}
      disabled={disabled}
      onPointerDown={(event) => {
        traceBuff('react-pointerdown', { id: buff.id, button: event.button, disabled, pointerId: event.pointerId });
        if (event.button === 0) activate(event.currentTarget);
      }}
      onClick={(event) => {
        traceBuff('react-click', { id: buff.id, detail: event.detail, disabled });
        if (event.detail === 0) activate(event.currentTarget);
      }}
    >
      <StatusIcon markup={BUFF_SVG[buff.id]} />
      {buff.remain !== null && <span className="hud-buff-time">{buff.remain}</span>}
    </button>
  );
}
