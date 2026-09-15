import * as THREE from 'three';
import { EMOJI_ICONS } from '../social/EmojiIcons';
import { DOG_EMOJI_SVG } from '../../ui/icons/DogEmojiIcons';

const SHOW_SECONDS = 3;
const POP_SECONDS = 0.22;
const FADE_SECONDS = 0.5;
const HEAD_Y = 3.44;
import { emojiBubbleHeight, EMOJI_BUBBLE_ASPECT as ASPECT } from './EmojiBubbleSize';

interface Bubble {
  element: HTMLDivElement;
  target: THREE.Object3D;
  elapsed: number;
  heart?: boolean;
}

/** 屏幕矢量气泡：每帧投影头顶坐标，独立于 WebGL 渲染分辨率。 */
export class EmojiBubbles {
  private readonly active = new Map<THREE.Object3D, Bubble>();
  private readonly layer = document.createElement('div');
  private readonly anchor = new THREE.Vector3();

  constructor(container: HTMLElement, private readonly camera: THREE.OrthographicCamera) {
    Object.assign(this.layer.style, {
      position: 'absolute', inset: '0', overflow: 'hidden',
      pointerEvents: 'none', userSelect: 'none', zIndex: '30',
    });
    this.layer.setAttribute('aria-hidden', 'true');
    container.appendChild(this.layer);
  }

  show(target: THREE.Object3D, glyph: string): void {
    this.remove(target);
    const element = document.createElement('div');
    Object.assign(element.style, {
      position: 'absolute', left: '0', top: '0', display: 'none',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.94)', borderRadius: '999px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      fontFamily: 'sans-serif', lineHeight: '1',
    });
    const markup = EMOJI_ICONS[glyph];
    if (markup !== undefined) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 64 64');
      svg.style.width = '47.5%';
      svg.style.height = '59.375%';
      // 只使用内置图标标记，网络传来的 glyph 不作为 HTML 插入。
      svg.innerHTML = markup;
      element.appendChild(svg);
    } else {
      element.textContent = glyph;
    }
    this.layer.appendChild(element);
    this.active.set(target, { element, target, elapsed: 0 });
  }

  /** 复用薯条爱心 SVG 和头顶屏幕投影；房主状态决定开始/结束，无白底。 */
  syncHearts(targets: readonly THREE.Object3D[]): void {
    const wanted = new Set(targets);
    for (const bubble of this.active.values()) {
      if (bubble.heart && !wanted.has(bubble.target)) this.remove(bubble.target);
    }
    for (const target of targets) {
      if (this.active.has(target)) continue;
      this.show(target, '❤️');
      const bubble = this.active.get(target)!;
      bubble.heart = true;
      bubble.element.style.background = 'transparent';
      bubble.element.style.boxShadow = 'none';
      bubble.element.innerHTML = DOG_EMOJI_SVG['❤️'];
      const svg = bubble.element.firstElementChild as SVGElement;
      svg.style.width = '47.5%';
      svg.style.height = '59.375%';
    }
  }

  /** 在相机更新后调用，保持移动与缩放时的位置和场景一致。 */
  update(delta: number): void {
    if (!this.active.size) return;
    const width = this.layer.clientWidth;
    const height = this.layer.clientHeight;
    this.camera.updateMatrixWorld();
    const size = emojiBubbleHeight(height, this.camera);
    for (const bubble of this.active.values()) {
      bubble.elapsed += delta;
      if ((!bubble.heart && bubble.elapsed >= SHOW_SECONDS) || !bubble.target.parent) {
        this.remove(bubble.target);
        continue;
      }
      bubble.target.getWorldPosition(this.anchor);
      this.anchor.y += bubble.heart ? 1.65 : HEAD_Y;
      this.anchor.project(this.camera);
      const style = bubble.element.style;
      style.display = this.anchor.z < -1 || this.anchor.z > 1 ? 'none' : 'flex';
      const pop = Math.min(1, bubble.elapsed / POP_SECONDS);
      const backOut = 1 + 2.7 * Math.pow(pop - 1, 3) + 1.7 * Math.pow(pop - 1, 2);
      const bubbleHeight = size * backOut;
      style.width = `${bubbleHeight * ASPECT}px`;
      style.height = `${bubbleHeight}px`;
      style.fontSize = `${bubbleHeight * 0.59375}px`;
      const x = Math.round((this.anchor.x + 1) * width / 2);
      const y = Math.round((1 - this.anchor.y) * height / 2);
      style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      style.opacity = bubble.heart ? '1' : String(Math.min(1, (SHOW_SECONDS - bubble.elapsed) / FADE_SECONDS));
    }
  }

  remove(target: THREE.Object3D): void {
    this.active.get(target)?.element.remove();
    this.active.delete(target);
  }

  dispose(): void {
    this.active.clear();
    this.layer.remove();
  }
}
