import type { PlayerSession } from '../mp/PlayerSession';

export function canFinishWork(actor: PlayerSession, position: { x: number; z: number }, tool = 'shovel'): boolean {
  const p = actor.player.group.position;
  return !actor.survival.state.dead && !actor.player.isMoving && !actor.player.isSwimming
    && !actor.player.isSleeping && actor.player.currentTool === tool
    && Math.hypot(position.x - p.x, position.z - p.z) <= 2;
}

/** 将计时作业的最终世界修改交给房主；本机保持自己的计时和表现。 */
export class OwnerWork {
  private pending = new Set<string>();
  private generation = 0;
  constructor(private readonly send: (system: string, target: string, done: (accepted: boolean) => void) => boolean) {}

  submit(system: string, target: string): boolean {
    const key = `${system}/${target}`;
    if (this.pending.has(key)) return false;
    const generation = this.generation;
    this.pending.add(key);
    if (!this.send(system, target, () => { if (this.generation === generation) this.pending.delete(key); })) {
      this.pending.delete(key);
      return false;
    }
    return true;
  }
  reset(): void { this.pending.clear(); this.generation++; }
}

export class OwnerWorkRegistry<Actor> {
  private handlers = new Map<string, (actor: Actor, target: string) => boolean>();
  register(system: string, settle: (actor: Actor, target: string) => boolean): void {
    this.handlers.set(system, settle);
  }
  settle(actor: Actor, system: string, target: string): boolean {
    return this.handlers.get(system)?.(actor, target) ?? false;
  }
}
