import * as THREE from 'three';
import type { Player } from '../entities/Player';
import type { ResourceKind, Inventory } from './Inventory';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Particles } from '../fx/Particles';

const PICKUP_RANGE = 1.3; // 玩家走到掉落物该距离内自动拾取
const PICKUP_DELAY = 0.8; // 丢弃后短暂不可拾取,避免刚丢就捡回
const BOB_HEIGHT = 0.12; // 悬浮上下浮动幅度
const SPIN_SPEED = 1.6; // 旋转速度(弧度/秒)

/** 各道具的掉落物外观:低面数八面体 + 对应颜色 */
const DROP_STYLE: Record<ResourceKind, { color: string; scale: number }> = {
  wood: { color: '#8b5a2b', scale: 1 },
  gravel: { color: '#b5b0a8', scale: 0.8 },
  stone: { color: '#9a9a9a', scale: 1.1 },
  berry: { color: '#c0392b', scale: 0.7 },
};

type Drop = {
  kind: ResourceKind;
  count: number;
  mesh: THREE.Mesh;
  age: number;
  baseY: number;
};

/** 地面掉落物:丢弃的道具以小八面体落在玩家附近,旋转悬浮;走近自动拾回背包 */
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
    const geometry = new THREE.OctahedronGeometry(0.28 * style.scale);
    const material = new THREE.MeshStandardMaterial({
      color: style.color,
      flatShading: true,
      roughness: 0.9,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.6 + Math.random() * 0.5;
    const p = this.player.group.position;
    const x = p.x + Math.cos(angle) * radius;
    const z = p.z + Math.sin(angle) * radius;
    const baseY = Math.max(this.terrain.getHeight(x, z), 0) + 0.35;
    mesh.position.set(x, baseY, z);
    this.scene.add(mesh);
    this.drops.push({ kind, count, mesh, age: 0, baseY });
  }

  update(delta: number, elapsed: number): void {
    const p = this.player.group.position;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.age += delta;
      drop.mesh.rotation.y += SPIN_SPEED * delta;
      drop.mesh.position.y = drop.baseY + Math.sin(elapsed * 3 + i) * BOB_HEIGHT;
      if (drop.age < PICKUP_DELAY) continue;
      this.scratch.copy(drop.mesh.position);
      if (this.scratch.distanceTo(p) >= PICKUP_RANGE) continue;
      if (this.inventory.add(drop.kind, drop.count) < drop.count) continue; // 背包已满,留在地上
      this.fx.burst(drop.mesh.position, DROP_STYLE[drop.kind].color, 8);
      this.scene.remove(drop.mesh);
      drop.mesh.geometry.dispose();
      (drop.mesh.material as THREE.Material).dispose();
      this.drops.splice(i, 1);
    }
  }

  dispose(): void {
    for (const drop of this.drops) {
      this.scene.remove(drop.mesh);
      drop.mesh.geometry.dispose();
      (drop.mesh.material as THREE.Material).dispose();
    }
    this.drops = [];
  }
}
