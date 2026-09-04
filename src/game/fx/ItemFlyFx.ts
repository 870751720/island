import * as THREE from 'three';
import type { ResourceKind } from '../systems/Inventory';
import { makeDropModel } from '../systems/DropModels';

const FLY_TIME = 0.55; // 单件道具飞行时长(秒)
const ARC_HEIGHT = 2.4; // 抛物线最高点相对起点/终点的抬升
const SHRINK_START = 0.65; // 飞行进度超过该值后开始缩小,到达时缩没
const SPIN_SPEED = 7; // 飞行途中自转速度(弧度/秒)

type Flight = {
  mesh: THREE.Object3D;
  origin: THREE.Vector3;
  control: THREE.Vector3;
  /** 已飞行时间;负值为出发前的滞空等待(多件道具错峰出发) */
  t: number;
  onArrive?: () => void;
  /** 该件道具的飞行终点(联机时按入包玩家各自指定,缺省用实例默认目标) */
  getTarget?: () => THREE.Vector3;
};

/** 释放掉落物模型自建的几何体与材质(模型为一次性实例,不复用) */
function disposeMesh(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      (obj.material as THREE.Material).dispose();
    }
  });
}

/**
 * 入包表现:道具模型从交互点(资源点/掉落物处)沿抛物线飞向玩家后背,
 * 临近到达时边缩边转、缩没即消失,到达回调再弹出拾取飘字。
 * 目标点每帧向 getTarget 拉取,玩家移动时曲线终点随之跟随。
 */
export class ItemFlyFx {
  private flights: Flight[] = [];
  private target = new THREE.Vector3();

  constructor(
    private scene: THREE.Scene,
    private getTarget: () => THREE.Vector3
  ) {}

  /** 从 origin 起飞一件道具;delay 为错峰出发的等待秒数,getTarget 覆盖本实例默认终点 */
  spawn(kind: ResourceKind, origin: THREE.Vector3, delay = 0, onArrive?: () => void, getTarget?: () => THREE.Vector3): void {
    const mesh = makeDropModel(kind);
    mesh.position.copy(origin);
    mesh.scale.setScalar(0.8);
    this.scene.add(mesh);
    const control = origin.clone();
    control.y += ARC_HEIGHT;
    this.flights.push({ mesh, origin: origin.clone(), control, t: -delay, onArrive, getTarget });
  }

  update(delta: number): void {
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const f = this.flights[i];
      f.t += delta;
      if (f.t < 0) continue;
      this.target.copy(f.getTarget ? f.getTarget() : this.getTarget());
      const k = Math.min(f.t / FLY_TIME, 1);
      // 二次贝塞尔:起点→头顶弧顶→玩家后背
      const inv = 1 - k;
      f.mesh.position.set(
        inv * inv * f.origin.x + 2 * inv * k * f.control.x + k * k * this.target.x,
        inv * inv * f.origin.y + 2 * inv * k * f.control.y + k * k * this.target.y,
        inv * inv * f.origin.z + 2 * inv * k * f.control.z + k * k * this.target.z
      );
      f.mesh.rotation.y += SPIN_SPEED * delta;
      if (k > SHRINK_START) {
        f.mesh.scale.setScalar(Math.max(0.8 * (1 - (k - SHRINK_START) / (1 - SHRINK_START)), 0.001));
      }
      if (k >= 1) {
        f.onArrive?.();
        this.scene.remove(f.mesh);
        disposeMesh(f.mesh);
        this.flights.splice(i, 1);
      }
    }
  }
}
