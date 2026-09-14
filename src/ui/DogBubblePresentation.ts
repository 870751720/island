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
  element.style.width = stage ? '178px' : `${height * EMOJI_BUBBLE_ASPECT}px`;
  element.style.height = stage ? 'auto' : `${height}px`;
  element.style.borderRadius = stage ? '16px' : '999px';
  element.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
  if (element.dataset.glyph === key) return;
  element.dataset.glyph = key;
  element.replaceChildren();
  const content = document.createElement('span');
  if (stage) {
    content.style.cssText = 'display:block;box-sizing:border-box;width:100%;padding:10px 12px;text-align:center;color:#624622;border:2px solid #e8bc59;border-radius:16px;background:linear-gradient(135deg,#fff9df,#ffe7a3);box-shadow:0 0 16px #edc25b66';
    const title = document.createElement('strong');
    title.textContent = `✦ 成长至 ${stage.stage} 阶段 ✦`;
    title.style.cssText = 'display:block;font-size:15px';
    const detail = document.createElement('span');
    detail.textContent = `${stage.name} · 攻击力 ${stage.stage}`;
    detail.style.cssText = 'display:block;margin-top:4px;font-size:12px';
    content.append(title, detail);
    content.setAttribute('role', 'status');
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      content.animate([
        { opacity: 0, transform: 'translateY(12px) scale(.7)' },
        { opacity: 1, transform: 'translateY(-5px) scale(1.08)', offset: 0.14 },
        { opacity: 1, transform: 'translateY(0) scale(1)', offset: 0.24 },
        { opacity: 1, transform: 'translateY(0) scale(1)', offset: 0.88 },
        { opacity: 0, transform: 'translateY(-14px) scale(1)' },
      ], { duration: 4000, fill: 'forwards' });
    }
  } else {
    content.style.cssText = `width:${EMOJI_CONTENT_RATIO / EMOJI_BUBBLE_ASPECT * 100}%;height:${EMOJI_CONTENT_RATIO * 100}%;display:block`;
    content.innerHTML = DOG_EMOJI_SVG[emoji!] ?? DOG_EMOJI_SVG['🐕'];
  }
  element.append(content);
}
