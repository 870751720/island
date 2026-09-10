import * as THREE from 'three';
import { createCloudTexture } from './CloudModel';

const CLOUD_COUNT = 6;
const DRIFT_DIR = new THREE.Vector3(1, 0, 0.25).normalize();

/** 稀疏柔边云团：共享纹理与平面，逐朵排序，随场景光照变化。 */
export class Clouds {
  readonly group = new THREE.Group();
  private readonly clouds: { mesh: THREE.Mesh; margin: number }[] = [];
  private readonly geometry = new THREE.PlaneGeometry(1, 1);
  private readonly materials = Array.from({ length: 3 }, (_, index) => new THREE.MeshStandardMaterial({
    map: createCloudTexture(index), transparent: true, depthWrite: false,
    roughness: 1, metalness: 0, side: THREE.DoubleSide,
  }));
  private readonly cameraRotation = new THREE.Quaternion();

  constructor(private readonly spanX = 150, private readonly spanZ = 150) {
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const mesh = new THREE.Mesh(this.geometry, this.materials[i % this.materials.length]);
      const width = 19 + (i % 3) * 2;
      mesh.scale.set(width, width * 0.5, 1);
      // 分为两列三行，等速漂移保持留白，避免随机扎堆变成云海。
      mesh.position.set(
        ((i % 2) - 0.5) * spanX * 0.55 + (Math.floor(i / 2) - 1) * spanX * 0.08,
        26 + (i % 3) * 3,
        (Math.floor(i / 2) - 1) * spanZ / 3,
      );
      this.clouds.push({ mesh, margin: width * 0.56 });
      this.group.add(mesh);
    }
  }

  update(delta: number): void {
    for (const { mesh, margin } of this.clouds) {
      mesh.position.addScaledVector(DRIFT_DIR, delta * 1.15);
      const limitX = this.spanX / 2 + margin;
      const limitZ = this.spanZ / 2 + margin;
      if (mesh.position.x > limitX) mesh.position.x -= limitX * 2;
      if (mesh.position.z > limitZ) mesh.position.z -= limitZ * 2;
    }
  }

  /** 在相机完成本帧移动后对齐，兼容拍照模式的旋转和俯仰。 */
  faceCamera(camera: THREE.Camera): void {
    camera.getWorldQuaternion(this.cameraRotation);
    for (const { mesh } of this.clouds) mesh.quaternion.copy(this.cameraRotation);
  }

  dispose(): void {
    this.geometry.dispose();
    for (const material of this.materials) {
      material.map?.dispose();
      material.dispose();
    }
    this.clouds.length = 0;
    this.group.clear();
  }
}
