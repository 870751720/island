import type { MouseEvent } from 'react';
import { playUiSound } from '@/game/audio/UiAudio';

/** 普通按钮由容器捕获；确认操作由业务校验通过后播放，避免重复与无效确认。 */
export function buttonAudio(event: MouseEvent<HTMLElement>): void {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest('button');
  if (!button || button.disabled || button.dataset.uiSound === 'manual') return;
  playUiSound();
}
