import * as THREE from 'three';
import type { Player } from '../entities/Player';
import type { ResourceKind, Inventory } from './Inventory';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Particles } from '../fx/Particles';

const PICKUP_RANGE = 1.6; // 玩家距掉落物该距离内时出现「捡回」卡片
const PICKUP_DELAY = 0.5; // 丢弃后短暂不可捡回,避免刚丢就提示
const BOB_HEIGHT = 0.15; // 悬浮上下浮动幅度
const SPIN_SPEED = 1.6; // 旋转速度(弧度/秒)

/** 各道具的掉落物外观:低面数八面体 + 对应颜色(手机小屏上要足够显眼) */
const DROP_STYLE: Record<ResourceKind, { color: string; scale: number }> = {
  wood: { color: '#8b5a2b', scale: 1.2 },
  gravel: { color: '#b5b0a8', scale: 1 },
  stone: { color: '#9a9a9a', scale: 1.3 },
  berry: { color: '#c0392b', scale: 0.9 },
};

export type DropInfo = { kind: ResourceKind; count: number };

type Drop = {
  kind: ResourceKind;
  count: number;
  mesh: THREE.Mesh;
  age: number;
  baseY: number;
};

/** 地面掉落物:丢弃的道具以八面体落在玩家附近,旋转悬浮;靠近后出现「捡回」卡片,点击才拾回背包 */
export class DropSystem {
  private drops: Drop[] = [];
  private scratch = new THREE.Vector3();

  constructor(
    private scene: THREE.Scene,
    private player: Player,
    private inventory: Inventory,
    private terrain: IslandTerrain,
    private fx: Particles
  ) {}

  /** 在玩家附近丢弃道具(带随机偏移,避免叠在角色脚下) */
  drop(kind: ResourceKind, count: number): void {
    const style = DROP_STYLE[kind];
    const geometry = new THREE.OctahedronGeometry(0.42 * style.scale);
    const material = new THREE.MeshStandardMaterial({
      color: style.color,
      flatShading: true,
      roughness: 0.9,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.7 + Math.random() * 0.5;
    const p = this.player.group.position;
    const x = p.x + Math.cos(angle) * radius;
    const z = p.z + Math.sin(angle) * radius;
    const baseY = Math.max(this.terrain.getHeight(x, z), 0) + 0.5;
    mesh.position.set(x, baseY, z);
    this.scene.add(mesh);
    this.drops.push({ kind, count, mesh, age: 0, baseY });
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
    return nearest ? { kind: nearest.kind, count: nearest.count } : null;
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
      this.fx.burst(drop.mesh.position, DROP_STYLE[drop.kind].color, 8);
      this.remove(i);
      return true;
    }
    return false;
  }

  private remove(index: number): void {
    const drop = this.drops[index];
    this.scene.remove(drop.mesh);
    drop.mesh.geometry.dispose();
    (drop.mesh.material as THREE.Material).dispose();
    this.drops.splice(index, 1);
  }

  dispose(): void {
    for (let i = this.drops.length - 1; i >= 0; i--) this.remove(i);
  }
}
