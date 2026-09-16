import * as THREE from 'three';

export type AimTarget = { key: string; pos: THREE.Vector3 };

/** 单手远程瞄准：追击记忆、稳定锁定与准备精度，均为射手本地状态。 */
export class AutoAim {
  readonly direction = new THREE.Vector2();
  target: AimTarget | null = null;
  private lastAttacked: string | null = null;
  private prepared = 0;
  private fullTime = 1;

  get progress(): number { return Math.min(1, this.prepared / this.fullTime); }
  get ready(): boolean { return this.prepared >= 0.3; }
  /** 散布半角：刚开始 22°，满准备 0.5°。 */
  get spread(): number { return THREE.MathUtils.degToRad(0.5 + 21.5 * (1 - this.progress) ** 2); }

  update(candidates: AimTarget[], origin: THREE.Vector3, movement: THREE.Vector2, delta: number, fullTime: number): void {
    this.fullTime = fullTime;
    if (!candidates.some(t => t.key === this.lastAttacked)) this.lastAttacked = null;
    let selected = candidates.find(t => t.key === this.lastAttacked)
      ?? candidates.find(t => t.key === this.target?.key) ?? null;
    if (!selected) {
      let bestScore = Infinity;
      for (const candidate of candidates) {
        const dx = candidate.pos.x - origin.x;
        const dz = candidate.pos.z - origin.z;
        const distance = Math.hypot(dx, dz);
        const forward = movement.lengthSq() > 0.001 && distance > 0.001
          && (dx * movement.x + dz * movement.y) / (distance * movement.length()) >= 0.5;
        const score = distance + (forward ? 0 : 1000);
        if (score < bestScore) { selected = candidate; bestScore = score; }
      }
    }
    if (selected?.key !== this.target?.key) this.prepared = 0;
    this.target = selected;
    if (!selected) { this.prepared = 0; return; }
    this.direction.set(selected.pos.x - origin.x, selected.pos.z - origin.z);
    if (this.direction.lengthSq() < 0.000001) this.direction.set(0, 1);
    else this.direction.normalize();
    if (movement.lengthSq() > 0.001) this.prepared = Math.min(fullTime, this.prepared + delta);
  }

  release(out: THREE.Vector2): void {
    const angle = (Math.random() * 2 - 1) * this.spread;
    const c = Math.cos(angle), s = Math.sin(angle);
    out.set(this.direction.x * c - this.direction.y * s, this.direction.x * s + this.direction.y * c);
    this.lastAttacked = this.target?.key ?? null;
    this.reset();
  }

  reset(): void { this.prepared = 0; this.target = null; }
}
