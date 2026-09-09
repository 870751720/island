import * as THREE from 'three';
import type { PlayerSession } from '../mp/PlayerSession';
import type { PickupToast } from '../GameContracts';
import { ItemFlyFx } from '../fx/ItemFlyFx';
import type { ResourceKind } from '../systems/Inventory';

type PickupItem = { kind: ResourceKind; count: number };

export class PickupPresentation {
  private pending: PickupItem[] = [];
  private origins = new Map<string, { pos: THREE.Vector3; until: number }>();
  private targets = new Map<string, () => THREE.Vector3>();
  private readonly itemFly: ItemFlyFx;

  constructor(
    scene: THREE.Scene,
    private readonly localSession: () => PlayerSession,
    private readonly camera: THREE.Camera,
    private readonly viewport: () => { width: number; height: number },
    private readonly onPickup: (toast: PickupToast) => void,
    private readonly playPickup: () => void
  ) {
    this.itemFly = new ItemFlyFx(scene, () => this.targetFor(this.localSession())());
  }

  markOrigin(position: THREE.Vector3, session = this.localSession()): void {
    this.origins.set(session.id, { pos: position.clone(), until: performance.now() + 1000 });
  }

  emit(kind: ResourceKind, count: number): void {
    const existing = this.pending.find((item) => item.kind === kind);
    if (existing) existing.count += count;
    else this.pending.push({ kind, count });
  }

  originFor(session: PlayerSession): THREE.Vector3 {
    const origin = this.origins.get(session.id);
    if (origin && performance.now() <= origin.until) return origin.pos;
    if (origin) this.origins.delete(session.id);
    const p = session.player.group.position;
    const rot = session.player.group.rotation.y;
    return new THREE.Vector3(p.x + Math.sin(rot) * 0.9, p.y + 1, p.z + Math.cos(rot) * 0.9);
  }

  spawn(session: PlayerSession, origin: THREE.Vector3, items: PickupItem[], onDone?: () => void): void {
    const spawns: { kind: ResourceKind; delay: number }[] = [];
    for (const item of items) {
      const count = Math.min(item.count, 3);
      for (let i = 0; i < count; i++) spawns.push({ kind: item.kind, delay: spawns.length * 0.12 });
    }
    if (spawns.length === 0) {
      onDone?.();
      return;
    }
    const target = this.targetFor(session);
    let remaining = spawns.length;
    for (const spawn of spawns) {
      this.itemFly.spawn(spawn.kind, origin, spawn.delay, () => {
        if (--remaining === 0) onDone?.();
      }, target);
    }
  }

  flush(): void {
    if (this.pending.length === 0) return;
    const items = this.pending;
    this.pending = [];
    const local = this.localSession();
    this.spawn(local, this.originFor(local), items, () => {
      this.playPickup();
      const p = local.player.group.position;
      const head = new THREE.Vector3(p.x, p.y + 3.2, p.z).project(this.camera);
      const { width, height } = this.viewport();
      this.onPickup({
        items,
        x: Math.round(((head.x + 1) / 2) * width),
        y: Math.round(((1 - head.y) / 2) * height),
      });
    });
  }

  update(delta: number): void {
    this.itemFly.update(delta);
  }

  dispose(): void {
    this.origins.clear();
    this.targets.clear();
  }

  private targetFor(session: PlayerSession): () => THREE.Vector3 {
    let target = this.targets.get(session.id);
    if (!target) {
      const value = new THREE.Vector3();
      target = () => {
        const p = session.player.group.position;
        const rot = session.player.group.rotation.y;
        return value.set(p.x - Math.sin(rot) * 0.45, p.y + 1.5, p.z - Math.cos(rot) * 0.45);
      };
      this.targets.set(session.id, target);
    }
    return target;
  }
}
