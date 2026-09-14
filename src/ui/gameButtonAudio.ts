import type { MouseEvent, PointerEvent } from 'react';
import { playUiSound } from '@/game/audio/UiAudio';

function playButtonSound(event: MouseEvent<HTMLElement>): void {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest('button, [role="button"], [data-ui-sound="click"]');
  if (!button || !event.currentTarget.contains(button)
    || button.matches(':disabled, [aria-disabled="true"]')
    || button.getAttribute('data-ui-sound') === 'manual') return;
  playUiSound('click', 'game');
}

/** 在业务处理前捕获，兼容 preventDefault、停止冒泡及按下即关闭面板的触屏按钮。 */
export function gameButtonPointerAudio(event: PointerEvent<HTMLElement>): void {
  if (event.button === 0) playButtonSound(event);
}

/** 键盘与辅助技术没有 pointerdown；触屏产生的后续 click 不重复发声。 */
export function gameButtonClickAudio(event: MouseEvent<HTMLElement>): void {
  if (event.detail === 0) playButtonSound(event);
}
