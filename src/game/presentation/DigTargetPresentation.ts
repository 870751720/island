import type { Object3D } from 'three';
import type { PlayerSession } from '../mp/PlayerSession';

export type DigTargetSnapshot = { source: string; x: number; z: number };
export type DigTargetSource = {
  getDigTarget(actor: PlayerSession): Object3D | null;
  findDigVisual(x: number, z: number): Object3D | null;
};

/** 同一套目标读取用于本地表现与房主快照，客人只解析指定实体，不另选最近目标。 */
export class DigTargetPresentation {
  constructor(private readonly sources: Record<string, DigTargetSource>) {}

  snapshot(actor: PlayerSession): DigTargetSnapshot | null {
    if (actor.player.currentTool !== 'shovel' || actor.player.isMoving || actor.player.isSwimming || actor.survival.state.dead) return null;
    for (const [source, system] of Object.entries(this.sources)) {
      const target = system.getDigTarget(actor);
      if (target?.parent) return { source, x: target.position.x, z: target.position.z };
    }
    return null;
  }

  resolve(target: DigTargetSnapshot | null): Object3D | null {
    return target ? this.sources[target.source]?.findDigVisual(target.x, target.z) ?? null : null;
  }
}
