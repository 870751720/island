import * as THREE from 'three';

/** 修改头脸、腮红与两套头发的顶点，装备挂点保持原样。 */
export class BoyHeadShape {
  private gender: 'boy' | 'girl' | null = null;
  private readonly surfaces: { geometry: THREE.BufferGeometry; original: Float32Array }[] = [];

  constructor(head: THREE.Mesh) {
    const capture = (mesh: THREE.Mesh) => {
      this.surfaces.push({ geometry: mesh.geometry,
        original: new Float32Array(mesh.geometry.getAttribute('position').array) });
    };
    capture(head);
    head.traverse(node => { if (node !== head && node instanceof THREE.Mesh) capture(node); });
  }

  /** 头部基准半径，与 PlayerModel 头部缩放一致，用于把顶点归一化后再变形。 */
  private static readonly RADIUS = { x: 0.305, y: 0.3, z: 0.265 };

  apply(gender: 'boy' | 'girl'): void {
    if (this.gender === gender) return;
    this.gender = gender;
    const { y: hy, z: hz } = BoyHeadShape.RADIUS;
    const boy = gender === 'boy';
    const width = boy ? 0.93 : 0.97;
    const taper = boy ? 0.3 : 0.16;
    const flatten = boy ? 0.1 : 0.07;
    const back = 1.05;
    for (const { geometry, original } of this.surfaces) {
      const positions = geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        let x = original[i * 3], y = original[i * 3 + 1], z = original[i * 3 + 2];
        const lower = Math.min(Math.max(-y / hy, 0), 1);
        x *= width * (1 - taper * lower * lower);
        if (z > 0) z *= 1 - flatten * (z / hz);
        else z *= back;
        positions.setXYZ(i, x, y, z);
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      geometry.computeBoundingBox();
    }
  }
}
