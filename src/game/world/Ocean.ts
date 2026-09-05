import * as THREE from 'three';
import type { OceanDepth } from './OceanDepth';
import { OceanMaterial } from './OceanMaterial';

/** 单块低面数海面覆盖当前镜头,海域范围不依赖岛屿大小;深浅与波纹由 OceanMaterial 负责。 */
export class Ocean {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private readonly material: OceanMaterial;
  private readonly raycaster = new THREE.Raycaster();
  private readonly plane: THREE.Plane;
  private readonly point = new THREE.Vector3();
  private readonly corners = [
    new THREE.Vector2(-1, -1), new THREE.Vector2(-1, 1),
    new THREE.Vector2(1, -1), new THREE.Vector2(1, 1),
  ];

  constructor(seaLevel: number, depth: OceanDepth) {
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -seaLevel);
    this.material = new OceanMaterial(depth);
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = seaLevel;
  }

  update(camera: THREE.OrthographicCamera, elapsed: number): void {
    camera.updateMatrixWorld();
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (const corner of this.corners) {
      this.raycaster.setFromCamera(corner, camera);
      if (!this.raycaster.ray.intersectPlane(this.plane, this.point)) return;
      minX = Math.min(minX, this.point.x);
      maxX = Math.max(maxX, this.point.x);
      minZ = Math.min(minZ, this.point.z);
      maxZ = Math.max(maxZ, this.point.z);
    }
    this.mesh.position.x = (minX + maxX) / 2;
    this.mesh.position.z = (minZ + maxZ) / 2;
    this.mesh.scale.set(maxX - minX + 16, maxZ - minZ + 16, 1);
    this.material.update(elapsed);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
