import * as THREE from 'three';

const CLOUD_COUNT = 6;
const DRIFT_DIR = new THREE.Vector3(1, 0, 0.25).normalize();
/** 低多边形白云:高空缓慢飘过岛上,并在地面投下移动的影子 */
export class Clouds {
  readonly group = new THREE.Group();
  private clouds: { mesh: THREE.Group; speed: number }[] = [];
  private span: number;

  /** span 为飘动范围(世界坐标边长),略大于岛直径,保证每隔一阵就有云飘过头顶 */
  constructor(span = 150) {
    this.span = span;
    const mat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 1,
      flatShading: true,
    });
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const mesh = this.buildCloud(mat, i);
      this.clouds.push({ mesh, speed: 1 + Math.random() * 1.2 });
      this.group.add(mesh);
    }
  }

  /** 一朵云:3~5 个压扁的二十面体团块拼成 */
  private buildCloud(mat: THREE.Material, seed: number): THREE.Group {
    const rng = (i: number) => {
      const n = Math.sin(seed * 91.7 + i * 391.3) * 43758.5453;
      return n - Math.floor(n);
    };
    const g = new THREE.Group();
    const blobs = 3 + Math.floor(rng(1) * 3);
    for (let b = 0; b < blobs; b++) {
      const r = 2 + rng(b * 2 + 2) * 2.5;
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat);
      blob.position.set((b - blobs / 2) * r * 1.1, rng(b * 2 + 3) * 1.2, (rng(b * 2 + 4) - 0.5) * 2.5);
      blob.scale.y = 0.55;
      blob.castShadow = true;
      g.add(blob);
    }
    g.position.set(
      (rng(10) * 2 - 1) * this.span * 0.5,
      26 + rng(11) * 8,
      (rng(12) * 2 - 1) * this.span * 0.5
    );
    return g;
  }

  update(delta: number): void {
    const half = this.span / 2;
    for (const c of this.clouds) {
      c.mesh.position.addScaledVector(DRIFT_DIR, c.speed * delta);
      // 飘出范围后从另一侧回来,并换个随机高度
      if (Math.abs(c.mesh.position.x) > half || Math.abs(c.mesh.position.z) > half) {
        c.mesh.position.set(
          -Math.sign(c.mesh.position.x) * half,
          26 + Math.random() * 8,
          (Math.random() * 2 - 1) * half * 0.8
        );
      }
    }
  }
}
