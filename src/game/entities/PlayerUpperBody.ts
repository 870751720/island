import * as THREE from 'three';

/** 在原关节挂点内塑造平缓肩线，男孩略宽、女孩略收腰，切换时替换几何。 */
export class PlayerUpperBody {
  private gender: 'boy' | 'girl' | null = null;
  private readonly shapes: { mesh: THREE.Mesh; boy: THREE.BufferGeometry; girl: THREE.BufferGeometry }[] = [];
  private readonly originals: THREE.BufferGeometry[] = [];
  private readonly headY: number;

  constructor(private head: THREE.Mesh, torso: THREE.Mesh, neck: THREE.Mesh, sleeves: THREE.Mesh[]) {
    this.headY = head.position.y;
    this.shapes.push({
      mesh: torso,
      boy: lathe([[0, -0.29], [0.18, -0.27], [0.225, -0.19], [0.23, -0.03],
        [0.265, 0.13], [0.245, 0.17], [0.15, 0.205], [0.075, 0.225], [0, 0.225]], 0.67),
      girl: lathe([[0, -0.29], [0.165, -0.275], [0.2, -0.2], [0.205, -0.03],
        [0.248, 0.12], [0.232, 0.175], [0.14, 0.21], [0.07, 0.225], [0, 0.225]], 0.64),
    });
    this.shapes.push({
      mesh: neck,
      boy: new THREE.CylinderGeometry(0.07, 0.08, 0.13, 10).translate(0, 0.018, 0),
      girl: new THREE.CylinderGeometry(0.062, 0.072, 0.12, 10).translate(0, 0.016, 0),
    });
    for (const sleeve of sleeves) this.shapes.push({
      mesh: sleeve,
      boy: new THREE.CapsuleGeometry(0.075, 0.045, 3, 8).scale(1, 1, 1.06).translate(0, -0.035, 0),
      girl: new THREE.CapsuleGeometry(0.068, 0.04, 3, 8).scale(1, 1, 1.04).translate(0, -0.032, 0),
    });
    for (const shape of this.shapes) this.originals.push(shape.mesh.geometry);
  }

  apply(gender: 'boy' | 'girl'): void {
    if (this.gender === gender) return;
    this.gender = gender;
    this.head.position.y = this.headY + 0.065;
    for (const shape of this.shapes) shape.mesh.geometry = gender === 'boy' ? shape.boy : shape.girl;
  }

  dispose(): void {
    this.head.position.y = this.headY;
    for (let i = 0; i < this.shapes.length; i++) {
      this.shapes[i].mesh.geometry = this.originals[i];
      this.shapes[i].boy.dispose();
      this.shapes[i].girl.dispose();
    }
  }
}

function lathe(profile: number[][], depth: number): THREE.BufferGeometry {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 12).scale(1, 1, depth);
}
