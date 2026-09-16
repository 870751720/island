import { useRef } from 'react';
import { playUiSound } from '@/game/audio/UiAudio';
import type { HudBuff } from '@/game/systems/BuffSystem';
import { StatusIcon, BUFF_SVG } from '../icons/StatusIcons';

const TAP_SLOP = 10;

/** 捕获轻点的松手事件，同时让浏览器接管列表的原生滚动。 */
export function BuffButton({ buff, expanded, onActivate }: {
  buff: HudBuff;
  expanded: boolean;
  onActivate: (rect: DOMRect) => void;
}) {
  const press = useRef<{ id: number; x: number; y: number } | null>(null);
  const activate = (button: HTMLButtonElement) => {
    playUiSound('click', 'game');
    onActivate(button.getBoundingClientRect());
  };
  return (
    <button
      type="button"
      className={`hud-buff${buff.good ? '' : ' is-bad'}`}
      data-ui-sound="manual"
      aria-label={`${buff.name}，${buff.good ? '增益' : '减益'}`}
      aria-expanded={expanded}
      onPointerDown={(event) => {
        if (event.button !== 0 || press.current) return;
        // 不 preventDefault：纵向滑动仍可触发原生滚动及 pointercancel。
        event.currentTarget.setPointerCapture(event.pointerId);
        press.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      }}
      onPointerMove={(event) => {
        const start = press.current;
        if (start?.id === event.pointerId
          && Math.hypot(event.clientX - start.x, event.clientY - start.y) > TAP_SLOP) {
          press.current = null;
        }
      }}
      onPointerUp={(event) => {
        const start = press.current;
        if (start?.id !== event.pointerId) return;
        press.current = null;
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > TAP_SLOP) return;
        event.preventDefault();
        activate(event.currentTarget);
      }}
      onPointerCancel={(event) => {
        if (press.current?.id === event.pointerId) press.current = null;
      }}
      onLostPointerCapture={(event) => {
        if (press.current?.id === event.pointerId) press.current = null;
      }}
      onClick={(event) => {
        // 指针点击已由 pointerup 处理；键盘/辅助技术继续使用 click。
        if (event.detail === 0) activate(event.currentTarget);
      }}
    >
      <StatusIcon markup={BUFF_SVG[buff.id]} />
      {buff.remain !== null && <span className="hud-buff-time">{buff.remain}</span>}
    </button>
  );
}
