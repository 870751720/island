import * as THREE from 'three';
import { GravelPath, type GravelPathSave } from '../entities/GravelPath';
import { GravelSurfaceBatch, type RoadNeighbors } from '../entities/GravelSurface';
import { ModelInstances } from '../core/ModelInstances';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { PlayerSession } from '../mp/PlayerSession';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { PlaceOccupancy } from './PlaceOccupancy';
import { dryCellReason } from './Facilities';
import { ActionHold } from './ActionHold';
import { shovelHits } from './ToolTiers';
import { WorldEntityIds, type EntityChangeSink } from './WorldEntityId';

type DigState = { target: GravelPath | null; elapsed: number; hold: ActionHold };

/** 世界共享路面；放置与回收仅在权威端结算，两端都可按脚下格查询加速。 */
export class GravelPathSystem {
  private paths = new Map<string, GravelPath>();
  private states = new Map<PlayerSession, DigState>();
  private ids = new WorldEntityIds<GravelPath>('gravelPath');
  private instances: ModelInstances;
  private surfaces: GravelSurfaceBatch;
  private dirty = new Set<string>();
  private onChanged?: EntityChangeSink;

  constructor(private scene: THREE.Scene, private terrain: IslandTerrain, private props: Props,
    private occupancy: PlaceOccupancy, private fx: Particles, private audio: GameAudio,
    private recover: (actor: PlayerSession) => void, private isBusy: (actor: PlayerSession) => boolean) {
    this.instances = new ModelInstances(scene);
    this.surfaces = new GravelSurfaceBatch(scene);
  }

  private key(x: number, z: number): string { return `${Math.round(x)},${Math.round(z)}`; }
  neighbors(x: number, z: number): RoadNeighbors {
    return (dx, dz) => this.paths.has(this.key(x + dx, z + dz));
  }
  neighborMask(x: number, z: number): number {
    let mask = 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (this.paths.has(this.key(x + dx, z + dz))) mask |= 1 << ((dz + 1) * 3 + dx + 1);
    }
    return mask;
  }
  private markAround(x: number, z: number): void {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) this.dirty.add(this.key(x + dx, z + dz));
  }
  contains(p: THREE.Vector3): boolean { return this.paths.has(this.key(p.x, p.z)); }
  blocksCell(p: THREE.Vector3): boolean {
    const x = Math.round(p.x), z = Math.round(p.z);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const path = this.paths.get(this.key(x + dx, z + dz));
      if (path && Math.hypot(path.group.position.x - p.x, path.group.position.z - p.z) < 1) return true;
    }
    return false;
  }
  canPlaceAt(actor: PlayerSession, x: number, z: number): string | null {
    return dryCellReason(actor, x, z, this.terrain, this.occupancy, this.props);
  }
  place(actor: PlayerSession, at: THREE.Vector3): boolean {
    if (this.canPlaceAt(actor, at.x, at.z) !== null || !actor.inventory.remove('gravelPath', 1)) return false;
    const path = this.add({ x: at.x, y: at.y, z: at.z });
    this.onChanged?.({ op: 'add', id: this.ids.get(path), value: this.save(path) });
    this.audio.play('drop');
    return true;
  }
  private add(value: GravelPathSave): GravelPath {
    const path = new GravelPath(this.scene, new THREE.Vector3(value.x, this.terrain.getHeight(value.x, value.z), value.z), {
      instances: this.instances, surfaces: this.surfaces,
    });
    this.ids.set(path, value.id);
    this.paths.set(this.key(value.x, value.z), path);
    this.markAround(value.x, value.z);
    return path;
  }
  private save(path: GravelPath): GravelPathSave {
    const { x, y, z } = path.group.position;
    return { id: this.ids.get(path), x, y, z };
  }
  updateActor(actor: PlayerSession, delta: number): void {
    let state = this.states.get(actor);
    if (!state) {
      state = { target: null, elapsed: 0, hold: new ActionHold() };
      this.states.set(actor, state);
    }
    try {
      let target: GravelPath | null = null;
      const p = actor.player.group.position;
      if (actor.player.currentTool === 'shovel' && !actor.player.isSwimming && !actor.player.isMoving && !this.isBusy(actor)) {
        let distance = 1.6;
        for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
          const path = this.paths.get(this.key(p.x + dx, p.z + dz));
          if (!path) continue;
          const d = Math.hypot(path.group.position.x - p.x, path.group.position.z - p.z);
          if (d < distance) { target = path; distance = d; }
        }
      }
      if (state.target !== target) state.elapsed = 0;
      state.target = target;
      if (!target) { state.elapsed = 0; return; }
      state.hold.hold(actor.player, 'mine');
      state.elapsed += delta;
      if (state.elapsed < shovelHits(actor.tools.shovel) * 0.6) return;
      const at = target.group.position;
      this.paths.delete(this.key(at.x, at.z));
      this.markAround(at.x, at.z);
      this.onChanged?.({ op: 'remove', id: this.ids.get(target) });
      this.fx.burst(at, '#aca99b', 6);
      target.remove(this.scene);
      this.recover(actor);
      this.audio.play('drop');
      state.target = null;
      state.elapsed = 0;
    } finally { state.hold.commit(actor.player); }
  }
  isDigging(actor: PlayerSession): boolean { return !!this.states.get(actor)?.target; }
  getDigProgress(actor: PlayerSession): number | null {
    const state = this.states.get(actor);
    return state?.target ? Math.min(1, state.elapsed / (shovelHits(actor.tools.shovel) * 0.6)) : null;
  }
  detach(actor: PlayerSession): void { this.states.delete(actor); }
  setChangeSink(sink?: EntityChangeSink): void { this.onChanged = sink; }
  snapshot(): GravelPathSave[] { return [...this.paths.values()].map((path) => this.save(path)); }
  restore(values: GravelPathSave[]): void { for (const value of values) this.add(value); }
  netApply(values: GravelPathSave[]): void {
    const incoming = new Set(values.map((value) => value.id));
    for (const [key, path] of this.paths) {
      if (incoming.has(this.ids.get(path))) continue;
      path.remove(this.scene);
      this.paths.delete(key);
      this.markAround(path.group.position.x, path.group.position.z);
    }
    for (const value of values) if (!this.paths.has(this.key(value.x, value.z))) this.add(value);
  }
  flushInstances(): void {
    for (const key of this.dirty) {
      const path = this.paths.get(key);
      if (path) path.fit(this.terrain, this.neighbors(path.group.position.x, path.group.position.z));
    }
    this.dirty.clear();
    this.surfaces.flush();
    this.instances.flush();
  }
  dispose(): void {
    for (const path of this.paths.values()) path.remove(this.scene);
    this.paths.clear();
    this.states.clear();
    this.instances.dispose();
    this.surfaces.dispose();
    this.dirty.clear();
  }
}
