import { path, line } from '../../ui/icons/SvgPaths';

const DURATION = 2.4;
const INTERVAL = 1;
const HEART_SVG = `<svg width="100%" height="100%" viewBox="0 0 64 64" aria-hidden="true">${path('M32 51L12 31Q2 12 20 13Q28 13 32 21Q41 6 53 16Q64 31 32 51', '#e65370', '#a93650', 2.5)}${line('M16 22Q20 17 24 22', '#ffd5df', 3)}</svg>`;

/** 固定复用三枚小爱心，使用游戏时间播放，暂停时同步停下。 */
export class FloatingHearts {
  readonly element = document.createElement('span');
  private readonly hearts: HTMLSpanElement[] = [];
  private elapsed = 0;

  constructor() {
    Object.assign(this.element.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
    for (let i = 0; i < 3; i++) {
      const heart = document.createElement('span');
      heart.innerHTML = HEART_SVG;
      Object.assign(heart.style, { position: 'absolute', left: '50%', bottom: '0', opacity: '0' });
      this.element.appendChild(heart);
      this.hearts.push(heart);
    }
  }

  update(delta: number, size: number, active: boolean): void {
    this.element.style.display = active ? 'block' : 'none';
    if (!active) { this.elapsed = 0; return; }
    this.elapsed += delta;
    for (const [i, heart] of this.hearts.entries()) {
      const age = this.elapsed - i * INTERVAL;
      const phase = age % (this.hearts.length * INTERVAL);
      const progress = Math.max(0, Math.min(1, phase / DURATION));
      const visible = age >= 0 && phase < DURATION;
      heart.style.opacity = visible ? String(Math.min(1, progress / 0.08, (1 - progress) / 0.35)) : '0';
      heart.style.width = heart.style.height = `${size * (0.42 + i * 0.07)}px`;
      const drift = Math.sin(progress * Math.PI * 1.5 + i * 2) * size * 0.35;
      heart.style.transform = `translate(-50%, 0) translate(${drift}px, ${-progress * size * 1.1}px) scale(${0.7 + progress * 0.3})`;
    }
  }
}
