import { canFinishWork } from '../net/OwnerWork';
import { recoveryInteraction, type FacilityInteractionSource } from './FacilityInteraction';
import * as THREE from 'three';
import { PlaceOccupancy } from './PlaceOccupancy';
import { shovelHits } from './ToolTiers';
import type { ResourceKind } from './Inventory';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { PlayerSession } from '../mp/PlayerSession';
import { WorldEntityIds, type EntityChangeSink } from './WorldEntityId';
import { cardinalRotY } from '../core/Facing';
import { ActionHold } from './ActionHold';
import { dryCellReason } from './Facilities';
import { disposeOwnedMeshes } from '../core/disposeOwnedMeshes';

const NEAR_RANGE = 2.2;
const DIG_RANGE = 1.6;
const SWING_TIME = 0.6;

export type ProcessingPlacement = { id?: string; x: number; y: number; z: number; rotY?: number };
export type ProcessingSave = ProcessingPlacement & { input: number; output: number; tickLeft: number };
export type ProcessingInfo = { input: number; output: number; progress: number };
export interface ProcessingEntity { group: THREE.Group; input: number; output: number; tickLeft: number; update(elapsed: number): void }
export type ProcessingConfig<S extends ProcessingPlacement> = {
  kind: ResourceKind; input: ResourceKind; output: ResourceKind;
  inputCount: number; outputCount: number; interval: number;
  create(scene: THREE.Scene, position: THREE.Vector3, rotY: number): ProcessingEntity;
  encode(state: ProcessingSave): S;
  decode(state: S): ProcessingSave;
};

type DigState = { hold: ActionHold; swingTimer: number; hits: number; digTarget: ProcessingEntity | null };

/** 无燃料加工设施共用的生命周期；只有权威端扣原料并产出，客人只推进表现。 */
export class ProcessingSystem<S extends ProcessingPlacement> implements FacilityInteractionSource {
  private machines: ProcessingEntity[] = [];
  private scratch = new THREE.Vector3();
  private ids: WorldEntityIds<ProcessingEntity>;
  private onChanged?: EntityChangeSink;
  private digStates = new Map<PlayerSession, DigState>();

  setChangeSink(sink?: EntityChangeSink): void { this.onChanged = sink; }

  constructor(
    private config: ProcessingConfig<S>,
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio,
    /** 背包容纳不下的部分由调用方掉落到玩家身旁。 */
    private give: (kind: ResourceKind, count: number, actor: PlayerSession) => number,
    private occupancy: PlaceOccupancy,
    private isBusy: (actor: PlayerSession) => boolean = () => false
  ) { this.ids = new WorldEntityIds(config.kind); }

  get count(): number {
    return this.machines.length;
  }

  private st(actor: PlayerSession): DigState {
    let st = this.digStates.get(actor);
    if (!st) {
      st = { hold: new ActionHold(), swingTimer: 0, hits: 0, digTarget: null };
      this.digStates.set(actor, st);
    }
    return st;
  }

  detach(actor: PlayerSession): void {
    this.digStates.delete(actor);
  }

  nearbyId(actor: PlayerSession): string | null {
    const target = this.nearby(actor);
    return target ? this.ids.get(target) : null;
  }

  nearby(actor: PlayerSession): ProcessingEntity | null {
    let best: ProcessingEntity | null = null;
    let bestDist = NEAR_RANGE * NEAR_RANGE;
    for (const machine of this.machines) {
      if (actor.interactionTarget !== undefined && this.ids.get(machine) !== actor.interactionTarget) continue;
      this.scratch.copy(machine.group.position);
      this.scratch.y = actor.player.group.position.y;
      const d = this.scratch.distanceToSquared(actor.player.group.position);
      if (d < bestDist) {
        best = machine;
        bestDist = d;
      }
    }
    return best;
  }

  blocksCell(p: THREE.Vector3): boolean {
    return this.machines.some((e) => {
      this.scratch.copy(e.group.position);
      this.scratch.y = p.y;
      return this.scratch.distanceTo(p) < 1;
    });
  }

  canPlaceAt(actor: PlayerSession, x: number, z: number): string | null {
    return dryCellReason(actor, x, z, this.terrain, this.occupancy, this.props);
  }

  use(actor: PlayerSession, at: THREE.Vector3): boolean {
    if (actor.inventory.count(this.config.kind) <= 0 || this.canPlaceAt(actor, at.x, at.z) !== null) return false;
    actor.inventory.remove(this.config.kind, 1);
    const machine = this.placeAt(at, cardinalRotY(actor.player.group.rotation.y));
    const fxPos = machine.group.position.clone();
    fxPos.y += 0.5;
    this.fx.burst(fxPos, '#8a6239', 10);
    return true;
  }

  private placeAt(position: THREE.Vector3, rotY: number): ProcessingEntity {
    const machine = this.config.create(this.scene, position, rotY);
    machine.tickLeft = this.config.interval;
    this.machines.push(machine);
    const p = machine.group.position;
    this.onChanged?.({ op: 'add', id: this.ids.get(machine), value: { ...this.config.encode({ id: this.ids.get(machine), x: p.x, y: p.y, z: p.z, rotY: machine.group.rotation.y, input: machine.input, output: machine.output, tickLeft: machine.tickLeft }) } });
    return machine;
  }

  feed(actor: PlayerSession, count = 0): boolean {
    const machine = this.nearby(actor);
    if (!Number.isSafeInteger(count)) return false;
    const n = Math.min(count > 0 ? count : Infinity, actor.inventory.count(this.config.input));
    if (!machine || n <= 0) return false;
    actor.inventory.remove(this.config.input, n);
    machine.input += n;
    this.emitState(machine);
    this.audio.play('drop');
    return true;
  }

  collect(actor: PlayerSession): boolean {
    const machine = this.nearby(actor);
    if (!machine || machine.output <= 0) return false;
    if (!actor.inventory.canFit(this.config.output)) return false;
    const n = machine.output;
    machine.output = 0;
    this.emitState(machine);
    this.give(this.config.output, n, actor);
    this.audio.play('success');
    return true;
  }

  takeInput(actor: PlayerSession): boolean {
    const machine = this.nearby(actor);
    if (!machine || machine.input <= 0) return false;
    const n = machine.input;
    machine.input = 0;
    machine.tickLeft = this.config.interval;
    this.emitState(machine);
    this.give(this.config.input, n, actor);
    this.audio.play('pickup');
    return true;
  }

  update(delta: number, elapsed: number, authority: boolean): void {
    for (const machine of this.machines) {
      machine.update(elapsed);
      if (machine.input < this.config.inputCount) {
        machine.tickLeft = this.config.interval;
        continue;
      }
      machine.tickLeft -= delta;
      if (!authority || machine.tickLeft > 0) continue;
      machine.input -= this.config.inputCount;
      machine.output += this.config.outputCount;
      machine.tickLeft += this.config.interval;
      this.emitState(machine);
      this.fx.burst(machine.group.position.clone().setY(machine.group.position.y + 0.5), '#e8e2d4', 4);
    }
  }

  getDigTarget(actor: PlayerSession): THREE.Object3D | null {
    return this.digStates.get(actor)?.digTarget?.group ?? null;
  }

  findDigVisual(x: number, z: number): THREE.Object3D | null {
    for (const item of this.machines) {
      if (Math.abs(item.group.position.x - x) < 0.001 && Math.abs(item.group.position.z - z) < 0.001) return item.group;
    }
    return null;
  }

  isDigging(actor: PlayerSession): boolean {
    return !!this.digStates.get(actor)?.digTarget;
  }

  settleDig(actor: PlayerSession, id: string): boolean {
    const target = this.machines.find(item => this.ids.get(item) === id);
    if (!target || !canFinishWork(actor, target.group.position)) return false;
    if (actor.ownerWork) return actor.ownerWork.submit(this.config.kind, id);
    this.machines.splice(this.machines.indexOf(target), 1);
    this.onChanged?.({ op: 'remove', id: this.ids.get(target) });
    this.scene.remove(target.group);
    disposeOwnedMeshes(target.group);
    this.give(this.config.kind, 1, actor);
    if (target.input > 0) this.give(this.config.input, target.input, actor);
    if (target.output > 0) this.give(this.config.output, target.output, actor);
    this.fx.burst(target.group.position, '#8a6239', 14);

    return true;
  }

  updateActor(actor: PlayerSession, delta: number): void {
    const st = this.st(actor);
    try {
      const p = actor.player.group.position;
      let target: ProcessingEntity | null = null;
      if (actor.player.currentTool === 'shovel' && !actor.player.isSwimming && !this.isBusy(actor)) {
        for (const machine of this.machines) {
          this.scratch.copy(machine.group.position);
          this.scratch.y = p.y;
          if (this.scratch.distanceTo(p) < DIG_RANGE) {
            target = machine;
            break;
          }
        }
      }
      if (!target || actor.player.isMoving) {
        st.digTarget = null;
        st.swingTimer = 0;
        st.hits = 0;
        return;
      }
      st.digTarget = target;
      st.hold.hold(actor.player, 'mine');
      st.swingTimer += delta;
      if (st.swingTimer < SWING_TIME) return;
      st.swingTimer = 0;
      this.fx.burst(target.group.position, '#8a6239', 6);
      st.hits += 1;
      if (st.hits < (shovelHits(actor.tools.shovel))) return;
      st.hits = 0;
      st.digTarget = null;
    this.settleDig(actor, this.ids.get(target));
    } finally {
      st.hold.commit(actor.player);
    }
  }

  getDigProgress(actor: PlayerSession): number | null {
    const st = this.digStates.get(actor);
    if (!st?.digTarget) return null;
    const need = shovelHits(actor.tools.shovel);
    return Math.min((st.hits + st.swingTimer / SWING_TIME) / need, 1);
  }

  nearbyInfo(actor: PlayerSession): ProcessingInfo | null {
    const machine = this.nearby(actor);
    if (!machine) return null;
    return {
      input: machine.input,
      output: machine.output,
      progress: machine.input >= this.config.inputCount ? 1 - Math.max(machine.tickLeft, 0) / this.config.interval : 0,
    };
  }

  snapshot(): S[] {
    return this.machines.map((machine) => {
      const p = machine.group.position;
      return this.config.encode({ id: this.ids.get(machine), x: p.x, y: p.y, z: p.z, rotY: machine.group.rotation.y, input: machine.input, output: machine.output, tickLeft: machine.tickLeft });
    });
  }

  clear(): void {
    for (const machine of this.machines) {
      this.scene.remove(machine.group);
      disposeOwnedMeshes(machine.group);
    }
    this.machines = [];
    this.digStates.clear();
  }

  restore(list: S[]): void {
    for (const saved of list) {
      const s = this.config.decode(saved);
      const machine = this.config.create(this.scene, new THREE.Vector3(s.x, s.y, s.z), s.rotY ?? 0);
      this.ids.set(machine, s.id);
      machine.input = s.input;
      machine.output = s.output;
      machine.tickLeft = s.tickLeft;
      this.machines.push(machine);
    }
  }

  private stateFields(machine: ProcessingEntity): Record<string, unknown> {
    const { id: _id, x: _x, y: _y, z: _z, rotY: _rotY, ...fields } = this.config.encode({ input: machine.input, output: machine.output, tickLeft: machine.tickLeft, x: 0, y: 0, z: 0 });
    return fields;
  }

  private emitState(machine: ProcessingEntity): void {
    this.onChanged?.({
      op: 'set',
      id: this.ids.get(machine),
      fields: this.stateFields(machine),
    });
  }

  netApply(list: S[]): void {
    const incoming = new Map(list.filter((x) => x.id).map((x) => [x.id!, x]));
    for (let i = this.machines.length - 1; i >= 0; i--) {
      if (incoming.has(this.ids.get(this.machines[i]))) continue;
      this.scene.remove(this.machines[i].group);
      disposeOwnedMeshes(this.machines[i].group);
      this.machines.splice(i, 1);
    }
    const current = new Map(this.machines.map((machine) => [this.ids.get(machine), machine]));
    for (const saved of list) {
      const value = this.config.decode(saved);
      const existed = value.id ? current.get(value.id) : undefined;
      let machine = existed;
      if (!machine) {
        machine = this.config.create(this.scene, new THREE.Vector3(value.x, value.y, value.z), value.rotY ?? 0);
        this.ids.set(machine, value.id);
        this.machines.push(machine);
      }
      // 新实体不补播；已有实体只有成品增加时才播放加工完成粒子。
      if (existed && value.output > machine.output) {
        this.fx.burst(machine.group.position.clone().setY(machine.group.position.y + 0.5), '#e8e2d4', 4);
      }
      machine.input = value.input;
      machine.output = value.output;
      machine.tickLeft = value.tickLeft;
    }
  }
  recoveryInteraction(actor: PlayerSession) {
    return recoveryInteraction(this, actor, this.config.kind);
  }

}
