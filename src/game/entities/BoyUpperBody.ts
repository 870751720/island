import * as THREE from 'three';

/** 在原关节挂点内塑造平缓肩线，切换女孩或整套预览时恢复基础几何。 */
export class BoyUpperBody {
  private active = false;
  private readonly shapes: { mesh: THREE.Mesh; original: THREE.BufferGeometry; boy: THREE.BufferGeometry }[] = [];
  private readonly headY: number;

  constructor(private head: THREE.Mesh, torso: THREE.Mesh, neck: THREE.Mesh, sleeves: THREE.Mesh[]) {
    this.headY = head.position.y;
    const profile = [[0, -0.29], [0.18, -0.27], [0.225, -0.19], [0.23, -0.03],
      [0.245, 0.13], [0.22, 0.17], [0.15, 0.205], [0.075, 0.225], [0, 0.225]];
    this.shapes.push({ mesh: torso, original: torso.geometry,
      boy: new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 12).scale(1, 1, 0.67) });
    this.shapes.push({ mesh: neck, original: neck.geometry,
      boy: new THREE.CylinderGeometry(0.067, 0.079, 0.18, 10).translate(0, 0.045, 0) });
    for (const sleeve of sleeves) this.shapes.push({ mesh: sleeve, original: sleeve.geometry,
      boy: new THREE.CapsuleGeometry(0.084, 0.06, 3, 8).scale(1, 1, 1.06) });
  }

  apply(active: boolean): void {
    if (this.active === active) return;
    this.active = active;
    this.head.position.y = this.headY + (active ? 0.12 : 0);
    for (const shape of this.shapes) shape.mesh.geometry = active ? shape.boy : shape.original;
  }

  dispose(): void {
    this.apply(false);
    for (const shape of this.shapes) shape.boy.dispose();
  }
}
