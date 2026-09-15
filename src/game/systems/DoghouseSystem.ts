import * as THREE from 'three';
import { Doghouse } from '../entities/Doghouse';
import type { PlayerSession } from '../mp/PlayerSession';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { ResourceKind } from './Inventory';
import type { PlaceOccupancy } from './PlaceOccupancy';
import { dryCellReason } from './Facilities';
import { cardinalRotY } from '../core/Facing';
import { ActionHold } from './ActionHold';
import { shovelHits } from './ToolTiers';
import { WorldEntityIds, type EntityChangeSink } from './WorldEntityId';
import { DOGHOUSE_NEAR_RANGE } from './DoghouseRest';

export type DoghouseSave = { id?: string; x: number; y: number; z: number; rotY?: number };
const SWING_TIME = 0.6;
type DigState = { target: Doghouse | null; hits: number; timer: number; hold: ActionHold };
const distance = (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.z - b.z);

/** 房主维护安放与回收，客人按稳定 ID 应用世界快照。 */
export class DoghouseSystem {
  private houses: Doghouse[] = [];
  private ids = new WorldEntityIds<Doghouse>('doghouse');
  private sink?: EntityChangeSink;
  private digging = new Map<PlayerSession, DigState>();

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio,
    private give: (kind: ResourceKind, count: number, actor: PlayerSession) => number,
    private occupancy: PlaceOccupancy,
    private busy: (actor: PlayerSession) => boolean,
  ) {}

  setChangeSink(sink?: EntityChangeSink): void { this.sink = sink; }
  detach(actor: PlayerSession): void { this.digging.delete(actor); }
  blocksCell(at: THREE.Vector3): boolean { return this.houses.some(h => distance(at, h.group.position) < 1); }
  canPlaceAt(actor: PlayerSession, x: number, z: number): string | null {
    return dryCellReason(actor, x, z, this.terrain, this.occupancy, this.props);
  }
  nearby(player: THREE.Vector3): Doghouse | null {
    let best: Doghouse | null = null, range = DOGHOUSE_NEAR_RANGE;
    for (const house of this.houses) {
      const d = distance(player, house.group.position);
      if (d <= range) { range = d; best = house; }
    }
    return best;
  }
  use(actor: PlayerSession, at: THREE.Vector3): boolean {
    if (actor.inventory.count('doghouse') < 1 || this.canPlaceAt(actor, at.x, at.z)) return false;
    actor.inventory.remove('doghouse', 1);
    const house = new Doghouse(this.scene, at, cardinalRotY(actor.player.group.rotation.y));
    this.houses.push(house);
    this.sink?.({ op: 'add', id: this.ids.get(house), value: this.save(house) });
    this.audio.play('success');
    this.fx.burst(at, '#d2b77c', 10);
    return true;
  }
  getDigTarget(actor: PlayerSession): THREE.Object3D | null { return this.digging.get(actor)?.target?.group ?? null; }
  findDigVisual(x: number, z: number): THREE.Object3D | null {
    return this.houses.find(h => Math.abs(h.group.position.x - x) < 0.001 && Math.abs(h.group.position.z - z) < 0.001)?.group ?? null;
  }
  isDigging(actor: PlayerSession): boolean { return !!this.digging.get(actor)?.target; }
  getDigProgress(actor: PlayerSession): number | null {
    const state = this.digging.get(actor);
    return state?.target ? Math.min(1, (state.hits + state.timer / SWING_TIME) / shovelHits(actor.tools.shovel)) : null;
  }
  updateActor(actor: PlayerSession, delta: number): void {
    let state = this.digging.get(actor);
    if (!state) { state = { target: null, timer: 0, hits: 0, hold: new ActionHold() }; this.digging.set(actor, state); }
    try {
      const player = actor.player;
      const target = player.currentTool === 'shovel' && !player.isSwimming && !player.isMoving && !this.busy(actor)
        ? this.houses.find(h => distance(player.group.position, h.group.position) < 1.6) ?? null : null;
      if (state.target !== target) { state.target = target; state.hits = state.timer = 0; }
      if (!target) return;
      state.hold.hold(player, 'mine');
      state.timer += delta;
      if (state.timer < SWING_TIME) return;
      state.timer = 0;
      this.fx.burst(target.group.position, '#b99c67', 6);
      if (++state.hits < shovelHits(actor.tools.shovel)) return;
      this.houses.splice(this.houses.indexOf(target), 1);
      this.sink?.({ op: 'remove', id: this.ids.get(target) });
      target.dispose();
      state.target = null;
      state.hits = 0;
      this.give('doghouse', 1, actor);
    } finally { state.hold.commit(actor.player); }
  }
  private save(house: Doghouse): DoghouseSave {
    const { x, y, z } = house.group.position;
    return { id: this.ids.get(house), x, y, z, rotY: house.group.rotation.y };
  }
  snapshot(): DoghouseSave[] { return this.houses.map(h => this.save(h)); }
  restore(list: DoghouseSave[]): void {
    for (const item of list) {
      const house = new Doghouse(this.scene, new THREE.Vector3(item.x, item.y, item.z), item.rotY ?? 0);
      this.ids.set(house, item.id);
      this.houses.push(house);
    }
  }
  netApply(list: DoghouseSave[]): void {
    const incoming = new Map(list.map(item => [item.id, item]));
    this.houses = this.houses.filter(house => {
      const item = incoming.get(this.ids.get(house));
      const p = house.group.position;
      if (item && p.x === item.x && p.y === item.y && p.z === item.z && house.group.rotation.y === (item.rotY ?? 0)) return true;
      house.dispose(); return false;
    });
    const existing = new Set(this.houses.map(h => this.ids.get(h)));
    this.restore(list.filter(item => !item.id || !existing.has(item.id)));
  }
}
