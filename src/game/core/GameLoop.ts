export type Updatable = {
  update: (delta: number, elapsed: number) => void;
};

export class GameLoop {
  private updatables: Updatable[] = [];
  private rafId = 0;
  private lastTime = 0;
  private running = false;

  add(updatable: Updatable): void {
    this.updatables.push(updatable);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      const delta = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;
      const elapsed = now / 1000;
      for (const u of this.updatables) u.update(delta, elapsed);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }
}
