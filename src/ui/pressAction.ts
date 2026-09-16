import type { MouseEvent, PointerEvent } from 'react';

/** 无拖动、滚动或长按语义的入口按下即执行；click 仅用于键盘和辅助技术。 */
export function pressAction(action: () => void) {
  return {
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (event.button !== 0 || event.currentTarget.disabled) return;
      event.preventDefault();
      action();
    },
    onClick(event: MouseEvent<HTMLButtonElement>) {
      if (event.detail === 0 && !event.currentTarget.disabled) action();
    },
  };
}
