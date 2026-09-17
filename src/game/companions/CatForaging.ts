import { Vector3 } from 'three';
import type { Player } from '../entities/Player';
import type { DogThreat } from '../entities/Wildlife';
import type { ResourceKind } from '../systems/Inventory';
import { CAT_STAGES, rollCatFood } from './CompanionDefinition';

type Hooks = {
  position: Vector3;
  dry(x: number, z: number): boolean;
  height(x: number, z: number): number;
  move(target: Vector3, speed: number, delta: number): boolean;
  reward(player: Player, kind: ResourceKind, position: Vector3): boolean;
  grow(amount: number): void;
};
export type CatActivity = 'idle' | 'sniff' | 'dig' | 'flee';

/** 只有权威端推进；途中状态不存档，完成后才抽食物、发奖和设置冷却。 */
export class CatForaging {
  cooldown = 0;
  activity: CatActivity = 'idle';
  moving = false;
  private site: Vector3 | null = null;
  private owner: Player | null = null;
  private elapsed = 0;
  private quiet = 0;
  private retry = 0;
  private dangers: Vector3[] = [];
  private escape: Vector3 | null = null;
  private escapeRetry = 0;
  constructor(private hooks: Hooks) {}

  restore(cooldown?: number): void {
    this.cooldown = Number.isFinite(cooldown) ? Math.max(0, Math.min(180, cooldown!)) : 0;
    this.cancel(); this.quiet = 0; this.dangers = []; this.escape = null; this.escapeRetry = 0;
  }
  cancel(): void { this.site = null; this.owner = null; this.elapsed = 0; this.activity = 'idle'; }

  update(delta: number, player: Player, alive: boolean, stage: number, threats: readonly DogThreat[], available: boolean): boolean {
    const h = this.hooks, pos = h.position, anchor = player.group.position;
    const dist = (a: Vector3, b: Vector3) => Math.hypot(a.x - b.x, a.z - b.z);
    this.cooldown = Math.max(0, this.cooldown - delta);
    this.retry = Math.max(0, this.retry - delta);
    this.escapeRetry = Math.max(0, this.escapeRetry - delta);
    this.moving = false;
    const nearby = threats.filter(t => dist(t.pos, pos) < 16 || dist(t.pos, anchor) < 14);
    if (nearby.length) { this.quiet = 5; this.dangers = nearby.map(t => t.pos.clone()); }
    else this.quiet = Math.max(0, this.quiet - delta);
    if (this.quiet > 0) {
      this.cancel(); this.activity = 'flee';
      const clearance = (p: Vector3) => Math.min(...this.dangers.map(d => dist(d, p)));
      if (clearance(pos) < 11) {
        if (this.escapeRetry <= 0) {
          this.escapeRetry = .4;
          let best: Vector3 | null = null, score = clearance(pos);
          // 全路径采样，不能为了躲避穿过围栏、建筑或进入水中。
          for (let i = 0; i < 16; i++) {
            const angle = i * Math.PI / 8;
            for (let step = 1; step <= 12; step++) {
              const p = new Vector3(pos.x + Math.cos(angle) * step * .4, 0, pos.z + Math.sin(angle) * step * .4);
              if (!h.dry(p.x, p.z)) break;
              const next = clearance(p);
              if (next > score + .05) { score = next; best = p; }
            }
          }
          this.escape = best;
        }
        if (this.escape && clearance(this.escape) > clearance(pos)) this.moving = h.move(this.escape, 4.6, delta);
      }
      return true;
    }
    if (this.activity === 'flee') this.activity = 'idle';
    this.escape = null; this.escapeRetry = 0;
    if (!alive || player.isSwimming || player.isSleeping || !h.dry(pos.x, pos.z)
      || dist(pos, anchor) > 6 || (this.owner && this.owner !== player)) {
      this.cancel(); this.retry = 1; return false;
    }
    if (!this.site) {
      if (!available || this.cooldown > 0 || this.retry > 0) return false;
      this.retry = 2;
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 1.2;
        const p = new Vector3(anchor.x + Math.cos(a) * r, 0, anchor.z + Math.sin(a) * r);
        const steps = Math.ceil(dist(pos, p) / .2);
        if (!Array.from({ length: steps + 1 }, (_, n) => n / Math.max(1, steps)).every(t => h.dry(pos.x + (p.x - pos.x) * t, pos.z + (p.z - pos.z) * t))) continue;
        p.y = h.height(p.x, p.z); this.site = p; this.owner = player; this.elapsed = 0; break;
      }
      if (!this.site) return false;
    }
    if (!h.dry(this.site.x, this.site.z)) { this.cancel(); return false; }
    this.elapsed += delta;
    if (dist(pos, this.site) > .25) {
      this.activity = 'sniff'; this.moving = h.move(this.site, 1.5, delta);
      if (this.elapsed > 10) { this.cancel(); this.retry = 2; }
      return true;
    }
    if (this.activity !== 'dig') { this.activity = 'dig'; this.elapsed = 0; }
    if (this.elapsed >= 3) {
      const cooldown = CAT_STAGES[stage - 1]?.cooldown ?? 180;
      if (this.owner && h.reward(this.owner, rollCatFood(stage), pos.clone())) {
        this.cooldown = cooldown; h.grow(6);
      }
      this.cancel(); this.retry = 1;
    }
    return true;
  }
}
