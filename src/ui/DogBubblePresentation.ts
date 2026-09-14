import { gameTheme } from './gameTheme';
import { DOG_STAGES } from '@/game/systems/DogGrowth';
import type { DogStageNotice } from '@/game/entities/Pomeranian';
import { EMOJI_BUBBLE_ASPECT, EMOJI_CONTENT_RATIO } from '@/game/ui3d/EmojiBubbleSize';
import { DOG_EMOJI_SVG } from './icons/DogEmojiIcons';

/** 沿用逐帧 DOM 定位，升级只创建一次内容和动画，不触发 React 每帧重渲染。 */
export function presentDogBubble(
  element: HTMLDivElement, emoji: string | null, x: number, y: number, height: number,
  notice: DogStageNotice | null,
): void {
  const stage = notice ? DOG_STAGES.find(s => s.stage === notice.stage) : null;
  element.style.display = emoji || stage ? 'flex' : 'none';
  if (!emoji && !stage) return;
  const key = stage && notice ? `stage-${notice.serial}` : emoji!;
  element.style.width = stage ? 'max-content' : `${height * EMOJI_BUBBLE_ASPECT}px`;
  element.style.height = stage ? 'auto' : `${height}px`;
  element.style.borderRadius = stage ? '0' : '999px';
  element.style.background = stage ? 'transparent' : gameTheme.panel;
  element.style.boxShadow = stage ? 'none' : '0 2px 8px rgba(0,0,0,0.25)';
  element.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
  if (element.dataset.glyph === key) return;
  element.dataset.glyph = key;
  element.replaceChildren();
  const content = document.createElement('span');
  if (stage) {
    content.className = 'quest-feedback';
    content.textContent = '更强了！';
    content.setAttribute('role', 'status');
  } else {
    content.style.cssText = `width:${EMOJI_CONTENT_RATIO / EMOJI_BUBBLE_ASPECT * 100}%;height:${EMOJI_CONTENT_RATIO * 100}%;display:block`;
    content.innerHTML = DOG_EMOJI_SVG[emoji!] ?? DOG_EMOJI_SVG['🐕'];
  }
  element.append(content);
}
