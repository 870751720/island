import * as THREE from 'three';
import { DOG_EMOJI_SVG } from '../../ui/icons/DogEmojiIcons';
import { emojiBubbleHeight } from './EmojiBubbleSize';
import type { Wildlife } from '../entities/Wildlife';

type Indicator = { element: HTMLDivElement; fill: HTMLElement; eating: HTMLElement; wool: HTMLElement; amount: number };
const heartPath = 'M32 54L10 32C-2 15 17 3 32 20C47 3 66 15 54 32Z';

/** DOM 矢量爱心：手机缩放保持清晰，填充平滑且不产生逐帧 React 更新。 */
export class HusbandryIndicators {
  private layer = document.createElement('div');
  private entries = new Map<number, Indicator>();
  private point = new THREE.Vector3();

  constructor(container: HTMLElement, private camera: THREE.OrthographicCamera, private wildlife: Wildlife) {
    Object.assign(this.layer.style, { position: 'absolute', inset: '0', overflow: 'hidden', pointerEvents: 'none', zIndex: '29' });
    this.layer.setAttribute('aria-hidden', 'true');
    container.appendChild(this.layer);
  }

  update(delta: number): void {
    const wanted = new Set<number>();
    const width = this.layer.clientWidth, height = this.layer.clientHeight;
    const size = Math.max(20, Math.min(38, emojiBubbleHeight(height, this.camera) * 0.7));
    for (const state of this.wildlife.husbandryIndicators()) {
      wanted.add(state.id);
      let entry = this.entries.get(state.id);
      if (!entry) {
        const element = document.createElement('div');
        Object.assign(element.style, { position: 'absolute', left: '0', top: '0', display: 'flex', alignItems: 'center', gap: '2px' });
        const heart = document.createElement('span');
        Object.assign(heart.style, { position: 'relative', display: 'block', width: '100%', height: '100%', flexShrink: '0' });
        heart.innerHTML = `<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="${heartPath}" fill="#fff5e9" stroke="#825853" stroke-width="4"/></svg>`;
        const fill = document.createElement('span');
        Object.assign(fill.style, { position: 'absolute', inset: '0', clipPath: 'inset(100% 0 0 0)' });
        fill.innerHTML = `<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="${heartPath}" fill="#db7d8a" stroke="#825853" stroke-width="4"/></svg>`;
        heart.appendChild(fill); element.appendChild(heart);
        const eating = document.createElement('span'); eating.innerHTML = DOG_EMOJI_SVG['😋']; element.appendChild(eating);
        const wool = document.createElement('span'); wool.textContent = '✂'; wool.style.color = '#fff5e9'; wool.style.textShadow = '0 1px 3px #48392b'; element.appendChild(wool);
        this.layer.appendChild(element);
        entry = { element, fill, eating, wool, amount: state.heart }; this.entries.set(state.id, entry);
      }
      entry.amount += (state.heart - entry.amount) * (1 - Math.exp(-8 * delta));
      entry.fill.style.clipPath = `inset(${100 * (1 - Math.max(0, Math.min(1, entry.amount)))}% 0 0 0)`;
      this.point.setFromMatrixPosition(state.target.matrixWorld); this.point.y += state.height;
      this.point.project(this.camera);
      entry.element.style.display = Math.abs(this.point.x) > 1.1 || Math.abs(this.point.y) > 1.1 || Math.abs(this.point.z) > 1 ? 'none' : 'flex';
      entry.element.style.width = entry.element.style.height = `${size}px`;
      entry.element.style.transform = `translate(-50%, -100%) translate(${(this.point.x * 0.5 + 0.5) * width}px, ${(-this.point.y * 0.5 + 0.5) * height}px)`;
      entry.eating.style.cssText = `display:${state.eating ? 'block' : 'none'};width:${size}px;height:${size}px;flex-shrink:0`;
      entry.wool.style.display = state.wool && !state.eating ? 'block' : 'none';
      entry.wool.style.fontSize = `${size * 0.8}px`;
    }
    for (const [id, entry] of this.entries) if (!wanted.has(id)) { entry.element.remove(); this.entries.delete(id); }
  }

  dispose(): void { this.layer.remove(); this.entries.clear(); }
}
