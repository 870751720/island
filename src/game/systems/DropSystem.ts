import * as THREE from 'three';
import type { Player } from '../entities/Player';
import type { ResourceKind, Inventory } from './Inventory';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import { DROP_COLORS, makeDropModel } from './DropModels';

const PICKUP_RANGE = 1.6; // 玩家距掉落物该距离内时出现「捡回」卡片
const PICKUP_DELAY = 0.5; // 丢弃后短暂不可捡回,避免刚丢就提示
const BOB_HEIGHT = 0.15; // 悬浮上下浮动幅度
const SPIN_SPEED = 1.6; // 旋转速度(弧度/秒)

/** 狗狗认得的肉块:生肉与烤肉都会被闻着味儿跑来吃掉 */
export const MEAT_KINDS: readonly ResourceKind[] = [
  'crabMeat',
  'birdMeat',
  'gameMeat',
  'cookedCrabMeat',
  'cookedBirdMeat',
  'cookedGameMeat',
];

/** 掉落物来源:玩家主动丢弃 / 击杀动物掉落 / 背包放不下溢出 */
export type DropSource = 'discarded' | 'loot' | 'overflow';

export type DropInfo = { kind: ResourceKind; count: number; source: DropSource };

type Drop = {
  kind: ResourceKind;
  count: number;
  source: DropSource;
  mesh: THREE.Object3D;
  age: number;
  baseY: number;
};

/** 地面掉落物:掉落的道具以各自专属造型落在玩家附近,旋转悬浮;靠近后出现「捡回」卡片,点击才拾回背包 */
export class DropSystem {
  private drops: Drop[] = [];
  private scratch = new THREE.Vector3();

  constructor(
    private scene: THREE.Scene,
    private player: Player,
    private inventory: Inventory,
    private terrain: IslandTerrain,
    private fx: Particles,
    private audio: GameAudio
  ) {}

  /** 在玩家附近丢弃道具(带随机偏移,避免叠在角色脚下) */
  drop(kind: ResourceKind, count: number): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.7 + Math.random() * 0.5;
    const p = this.player.group.position;
    this.spawn(
      kind,
      count,
      'discarded',
      p.x + Math.cos(angle) * radius,
      p.z + Math.sin(angle) * radius
    );
  }

  /** 背包放不下溢出到玩家附近(与主动丢弃区分来源) */
  dropOverflow(kind: ResourceKind, count: number): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.7 + Math.random() * 0.5;
    const p = this.player.group.position;
    this.spawn(
      kind,
      count,
      'overflow',
      p.x + Math.cos(angle) * radius,
      p.z + Math.sin(angle) * radius
    );
  }

  /** 在指定坐标掉落道具(狩猎战利品等),同样走「捡回」卡片拾取 */
  dropAt(kind: ResourceKind, count: number, x: number, z: number): void {
    this.spawn(kind, count, 'loot', x, z);
  }

  private spawn(kind: ResourceKind, count: number, source: DropSource, x: number, z: number): void {
    const mesh = makeDropModel(kind);
    const baseY = Math.max(this.terrain.getHeight(x, z), 0) + 0.5;
    mesh.position.set(x, baseY, z);
    this.scene.add(mesh);
    this.drops.push({ kind, count, source, mesh, age: 0, baseY });
    this.audio.play('drop');
  }

  update(delta: number, elapsed: number): void {
    for (let i = 0; i < this.drops.length; i++) {
      const drop = this.drops[i];
      drop.age += delta;
      drop.mesh.rotation.y += SPIN_SPEED * delta;
      drop.mesh.position.y = drop.baseY + Math.sin(elapsed * 3 + i) * BOB_HEIGHT;
    }
  }

  /** 玩家附近可捡回的掉落物(丢弃后马上不可见,避免刚丢就提示) */
  getNearby(): DropInfo | null {
    const p = this.player.group.position;
    let nearest: Drop | null = null;
    for (const drop of this.drops) {
      if (drop.age < PICKUP_DELAY) continue;
      this.scratch.copy(drop.mesh.position);
      if (this.scratch.distanceTo(p) >= PICKUP_RANGE) continue;
      if (!nearest || drop.age > nearest.age) nearest = drop;
    }
    return nearest ? { kind: nearest.kind, count: nearest.count, source: nearest.source } : null;
  }

  /** 捡回附近掉落物;背包放不下时返回 false(掉落物留在地上) */
  pickupNearby(): boolean {
    const p = this.player.group.position;
    for (let i = 0; i < this.drops.length; i++) {
      const drop = this.drops[i];
      if (drop.age < PICKUP_DELAY) continue;
      this.scratch.copy(drop.mesh.position);
      if (this.scratch.distanceTo(p) >= PICKUP_RANGE) continue;
      if (this.inventory.add(drop.kind, drop.count) < drop.count) return false;
      this.audio.play('pickup');
      this.fx.burst(drop.mesh.position, DROP_COLORS[drop.kind], 8);
      this.remove(i);
      return true;
    }
    return false;
  }

  /** 范围内最近的一块肉(狗狗寻肉用,只比较水平距离——肉块悬浮在空中),没有则 null。
   * 只认玩家主动丢弃的肉:狩猎战利品和背包溢出的不抢 */
  nearestMeat(origin: THREE.Vector3, range: number): THREE.Vector3 | null {
    let best: Drop | null = null;
    let bestDist = range * range;
    for (const drop of this.drops) {
      if (!MEAT_KINDS.includes(drop.kind) || drop.source !== 'discarded') continue;
      const dx = drop.mesh.position.x - origin.x;
      const dz = drop.mesh.position.z - origin.z;
      const d = dx * dx + dz * dz;
      if (d < bestDist) {
        best = drop;
        bestDist = d;
      }
    }
    return best ? best.mesh.position.clone() : null;
  }

  /** 吃掉范围内最近的一块肉(狗狗进食,不进背包),返回是否吃到 */
  consumeMeatNear(origin: THREE.Vector3, range: number): boolean {
    let best = -1;
    let bestDist = range * range;
    for (let i = 0; i < this.drops.length; i++) {
      const drop = this.drops[i];
      if (!MEAT_KINDS.includes(drop.kind)) continue;
      const dx = drop.mesh.position.x - origin.x;
      const dz = drop.mesh.position.z - origin.z;
      const d = dx * dx + dz * dz;
      if (d < bestDist) {
        best = i;
        bestDist = d;
      }
    }
    if (best < 0) return false;
    const drop = this.drops[best];
    this.fx.burst(drop.mesh.position, '#e8b88a', 6);
    this.remove(best);
    return true;
  }

  private remove(index: number): void {
    const drop = this.drops[index];
    this.scene.remove(drop.mesh);
    drop.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
    this.drops.splice(index, 1);
  }

  /** 当前所有地面掉落物的存档快照 */
  snapshot(): { kind: ResourceKind; count: number; x: number; z: number; source: DropSource }[] {
    return this.drops.map((drop) => ({
      kind: drop.kind,
      count: drop.count,
      source: drop.source,
      x: drop.mesh.position.x,
      z: drop.mesh.position.z,
    }));
  }

  /** 从存档恢复掉落物(不播丢落音效) */
  restore(
    list: { kind: ResourceKind; count: number; x: number; z: number; source: DropSource }[]
  ): void {
    for (const d of list) {
      if (d.count <= 0) continue;
      const mesh = makeDropModel(d.kind);
      const baseY = Math.max(this.terrain.getHeight(d.x, d.z), 0) + 0.5;
      mesh.position.set(d.x, baseY, d.z);
      this.scene.add(mesh);
      this.drops.push({ kind: d.kind, count: d.count, source: d.source, mesh, age: 0, baseY });
    }
  }

  dispose(): void {
    for (let i = this.drops.length - 1; i >= 0; i--) this.remove(i);
  }
}
