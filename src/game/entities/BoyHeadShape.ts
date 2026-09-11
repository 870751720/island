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

  /** 头部基准半径，与 PlayerModel 头部缩放一致，用于把顶点归一化后再变形。 */
  private static readonly RADIUS = { x: 0.305, y: 0.3, z: 0.265 };

  apply(boy: boolean): void {
    if (this.boy === boy) return;
    this.boy = boy;
    const { x: hx, y: hy, z: hz } = BoyHeadShape.RADIUS;
    // 男孩整体略窄；共同项：下半脸锥形收窄、前脸压平、后脑保持饱满。
    const width = boy ? 0.93 : 1;
    const taper = boy ? 0.3 : 0.24;
    const flatten = 0.1;
    const back = 1.05;
    for (const { geometry, original } of this.surfaces) {
      const positions = geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        let x = original[i * 3], y = original[i * 3 + 1], z = original[i * 3 + 2];
        // 下半脸越往下越窄，男孩下颌收得更利落。
        const lower = Math.min(Math.max(-y / hy, 0), 1);
        x *= width * (1 - taper * lower * lower);
        // 前脸压平成近似平面，后脑略微后鼓，形成前后不对称的头型。
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
