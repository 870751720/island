import * as THREE from 'three';

/** 仅修改原始头脸与男孩头发的顶点，附件挂点与女孩几何保持原样。 */
export class BoyHeadShape {
  private boy = false;
  private readonly surfaces: { geometry: THREE.BufferGeometry; original: Float32Array }[] = [];

  constructor(head: THREE.Mesh, boyHair: THREE.Group) {
    const capture = (mesh: THREE.Mesh) => {
      this.surfaces.push({ geometry: mesh.geometry,
        original: new Float32Array(mesh.geometry.getAttribute('position').array) });
    };
    capture(head);
    for (const child of head.children) if (child instanceof THREE.Mesh) capture(child);
    boyHair.traverse(node => { if (node instanceof THREE.Mesh) capture(node); });
  }

  apply(boy: boolean): void {
    if (this.boy === boy) return;
    this.boy = boy;
    for (const { geometry, original } of this.surfaces) {
      const positions = geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        const x = original[i * 3], y = original[i * 3 + 1], z = original[i * 3 + 2];
        // 颧骨以下渐收下颌，额头保留宽度；五官、耳朵和发型同步贴合。
        const jaw = THREE.MathUtils.smoothstep(-y, 0.03, 0.29);
        positions.setXYZ(i, boy ? x * (0.89 - jaw * 0.16) : x,
          boy ? y * 1.025 : y, boy ? z * 0.94 : z);
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      geometry.computeBoundingBox();
    }
  }
}
