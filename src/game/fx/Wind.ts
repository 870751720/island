import * as THREE from 'three';
import type { WindParams } from '../systems/WeatherSystem';

const LEAF_COUNT = 24;
const AREA = 36; // 玩家周围飘叶活动区域边长
const RADIUS = AREA / 2;
const HEIGHT_MIN = 0.6;
const HEIGHT_MAX = 5;
const SPEED_MIN = 2.5; // 顺风飘行速度范围
const SPEED_MAX = 4.5;

type Leaf = {
  x: number;
  y: number;
  z: number;
  speed: number;
  bobPhase: number;
  spin: number;
};

/**
 * 风中飘叶:单个 InstancedMesh 持一池小叶片,沿风向顺风飘行,
 * 顺风飘出活动区域后从上风处重生;透明度随风强度渐变,无风时隐藏。
 */
export class Wind {
  readonly mesh: THREE.InstancedMesh;
  private leaves: Leaf[] = [];
  private material: THREE.MeshStandardMaterial;
  private matrix = new THREE.Matrix4();
  private quat = new THREE.Quaternion();
  private euler = new THREE.Euler();
  private scale = new THREE.Vector3(1, 1, 1);
  private pos = new THREE.Vector3();

  constructor() {
    const geo = new THREE.PlaneGeometry(0.14, 0.08);
    this.material = new THREE.MeshStandardMaterial({
      color: '#cfe0a8',
      flatShading: true,
      roughness: 1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.mesh = new THREE.InstancedMesh(geo, this.material, LEAF_COUNT);
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
    for (let i = 0; i < LEAF_COUNT; i++) {
      this.leaves.push({
        x: (Math.random() - 0.5) * AREA,
        y: HEIGHT_MIN + Math.random() * (HEIGHT_MAX - HEIGHT_MIN),
        z: (Math.random() - 0.5) * AREA,
        speed: SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
        bobPhase: Math.random() * Math.PI * 2,
        spin: 2 + Math.random() * 3,
      });
    }
  }

  update(delta: number, center: THREE.Vector3, wind: WindParams): void {
    this.mesh.visible = wind.intensity > 0.02;
    if (!this.mesh.visible) return;
    this.material.opacity = 0.9 * wind.intensity;
    for (let i = 0; i < LEAF_COUNT; i++) {
      const leaf = this.leaves[i];
      leaf.bobPhase += delta * 3;
      // 顺风飘行 + 垂直方向的上下起伏 + 侧向摆动,让轨迹不成直线
      const drift = leaf.speed * wind.intensity * delta;
      leaf.x += wind.dirX * drift + Math.sin(leaf.bobPhase) * 0.4 * delta;
      leaf.z += wind.dirZ * drift + Math.cos(leaf.bobPhase * 0.8) * 0.4 * delta;
      leaf.y += Math.sin(leaf.bobPhase * 1.3) * 0.5 * delta;
      // 飘出活动区域或落地:从上风边缘高处重生
      const dx = leaf.x - center.x;
      const dz = leaf.z - center.z;
      const cross =
        dx * wind.dirX + dz * wind.dirZ + Math.hypot(dx, dz) * 0.3;
      if (cross > RADIUS || leaf.y < 0.2) {
        leaf.x = center.x - wind.dirX * RADIUS + (Math.random() - 0.5) * AREA * 0.6;
        leaf.z = center.z - wind.dirZ * RADIUS + (Math.random() - 0.5) * AREA * 0.6;
        leaf.y = HEIGHT_MIN + Math.random() * (HEIGHT_MAX - HEIGHT_MIN);
      }
      this.euler.set(leaf.bobPhase, leaf.bobPhase * 0.7, leaf.bobPhase * leaf.spin * 0.3);
      this.quat.setFromEuler(this.euler);
      this.pos.set(leaf.x, leaf.y, leaf.z);
      this.matrix.compose(this.pos, this.quat, this.scale);
      this.mesh.setMatrixAt(i, this.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
