/** 本地玩家通用掉血反馈；独立透明层不拦截触控，也不增加 WebGL 开销。 */
export class DamageScreenFlash {
  private readonly element = document.createElement('div');
  private animation: Animation | null = null;
  private lastFlash = -Infinity;

  constructor(container: HTMLElement) {
    this.element.setAttribute('aria-hidden', 'true');
    Object.assign(this.element.style, {
      position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '10',
      opacity: '0',
      background: 'radial-gradient(ellipse at center, rgba(180, 18, 35, 0) 32%, rgba(196, 25, 43, 0.16) 60%, rgba(175, 12, 32, 0.65) 100%)',
      boxShadow: 'inset 0 0 28px rgba(239, 65, 72, 0.3)',
    });
    container.appendChild(this.element);
  }

  flash(): void {
    const now = performance.now();
    // 持续溺水等逐帧扣血只产生舒缓脉冲，避免频闪或不断重启动画。
    if (now - this.lastFlash < 700) return;
    this.lastFlash = now;
    this.animation?.cancel();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.animation = this.element.animate([
      { opacity: 0 },
      { opacity: reduced ? 0.4 : 1, offset: 0.12 },
      { opacity: 0 },
    ], { duration: 650, easing: 'ease-out' });
  }

  dispose(): void {
    this.animation?.cancel();
    this.element.remove();
  }
}
