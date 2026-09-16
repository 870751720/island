import { playUiSound } from '@/game/audio/UiAudio';
import type { HudBuff } from '@/game/systems/BuffSystem';
import { StatusIcon, BUFF_SVG } from '../icons/StatusIcons';

/** 图标按下即显示详情；不阻止默认手势，让列表保留原生滚动。 */
export function BuffButton({ buff, expanded, disabled, onActivate }: {
  buff: HudBuff;
  expanded: boolean;
  disabled: boolean;
  onActivate: (rect: DOMRect) => void;
}) {
  const activate = (button: HTMLButtonElement) => {
    if (disabled) return;
    onActivate(button.getBoundingClientRect());
    playUiSound('click', 'game');
  };
  return (
    <button
      type="button"
      className={`hud-buff${buff.good ? '' : ' is-bad'}`}
      data-ui-sound="manual"
      aria-label={`${buff.name}，${buff.good ? '增益' : '减益'}`}
      aria-expanded={expanded}
      disabled={disabled}
      onPointerDown={(event) => {
        if (event.button === 0) activate(event.currentTarget);
      }}
      onClick={(event) => {
        if (event.detail === 0) activate(event.currentTarget);
      }}
    >
      <StatusIcon markup={BUFF_SVG[buff.id]} />
      {buff.remain !== null && <span className="hud-buff-time">{buff.remain}</span>}
    </button>
  );
}
