import * as THREE from 'three';
import { createCloudGeometry } from './CloudModel';

const CLOUD_COUNT = 6;
const DRIFT_DIR = new THREE.Vector3(1, 0, 0.25).normalize();
/** 低多边形白云:高空缓慢飘过岛上,并在地面投下移动的影子 */
export class Clouds {
  readonly group = new THREE.Group();
  private clouds: { mesh: THREE.Mesh; speed: number; margin: number }[] = [];
  private readonly material = new THREE.MeshStandardMaterial({
    color: '#ffffff', roughness: 1, metalness: 0, flatShading: true,
  });
  private spanX: number;
  private spanZ: number;

  /** 飘动范围(世界坐标,东西/南北各一个边长),略大于岛尺寸,保证每隔一阵就有云飘过头顶 */
  constructor(spanX = 150, spanZ = 150) {
    this.spanX = spanX;
    this.spanZ = spanZ;
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const mesh = this.buildCloud(i);
      const margin = (mesh.geometry.boundingSphere!.radius
        + mesh.geometry.boundingSphere!.center.length()) * Math.max(mesh.scale.x, mesh.scale.y, mesh.scale.z);
      this.clouds.push({ mesh, speed: 1 + Math.random() * 1.2, margin });
      this.group.add(mesh);
    }
  }

  private buildCloud(seed: number): THREE.Mesh {
    const rng = (i: number) => {
      const n = Math.sin(seed * 91.7 + i * 391.3) * 43758.5453;
      return n - Math.floor(n);
    };
    const g = new THREE.Mesh(createCloudGeometry(seed), this.material);
    const scale = 1.05 + rng(20) * 0.3;
    g.scale.set(scale * (0.95 + rng(21) * 0.3), scale * (0.8 + rng(22) * 0.35), scale);
    g.rotation.y = (rng(23) - 0.5) * Math.PI;
    g.castShadow = true;
    g.position.set(
      (rng(10) * 2 - 1) * this.spanX * 0.5,
      26 + rng(11) * 8,
      (rng(12) * 2 - 1) * this.spanZ * 0.5
    );
    return g;
  }

  update(delta: number): void {
    const halfX = this.spanX / 2;
    const halfZ = this.spanZ / 2;
    for (const c of this.clouds) {
      c.mesh.position.addScaledVector(DRIFT_DIR, c.speed * delta);
      // 完整云体离开岛屿范围后才回绕，分别处理两个轴，保留高度。
      const limitX = halfX + c.margin;
      const limitZ = halfZ + c.margin;
      if (c.mesh.position.x > limitX) c.mesh.position.x -= limitX * 2;
      if (c.mesh.position.z > limitZ) c.mesh.position.z -= limitZ * 2;
    }
  }

  dispose(): void {
    for (const cloud of this.clouds) cloud.mesh.geometry.dispose();
    this.material.dispose();
    this.clouds.length = 0;
    this.group.clear();
  }
}
