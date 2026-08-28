import * as THREE from 'three';

const SEA_LEVEL = -0.35;
const TIDE_AMPLITUDE = 0.12; // 潮汐涨落幅度
const TIDE_PERIOD = 120; // 一个潮汐周期(秒)
const WAVE_AMPLITUDE = 0.1;

/** 海面:低多边形波动的平面,水平面随潮汐缓慢涨落 */
export class Ocean {
  readonly mesh: THREE.Mesh;
  private baseXZ: Float32Array;
  private baseY: number;

  constructor(size = 400) {
    const segments = 56;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    // 保存原始网格坐标,每帧在其上叠加波浪
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    this.baseXZ = new Float32Array(pos.array as Float32Array);
    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: '#4aa3c7',
        roughness: 0.35,
        metalness: 0.1,
        transparent: true,
        opacity: 0.92,
        flatShading: true,
      })
    );
    this.baseY = SEA_LEVEL;
    this.mesh.position.y = SEA_LEVEL;
  }

  /** elapsed 为游戏累计时间(秒) */
  update(elapsed: number): void {
    // 涨潮退潮:水平面缓慢升降,沙滩上的水线随之进退
    this.mesh.position.y =
      this.baseY + Math.sin((elapsed / TIDE_PERIOD) * Math.PI * 2) * TIDE_AMPLITUDE;

    const pos = this.mesh.geometry.attributes.position as THREE.BufferAttribute;
    const t = elapsed;
    for (let i = 0; i < pos.count; i++) {
      const x = this.baseXZ[i * 3];
      const z = this.baseXZ[i * 3 + 2];
      pos.setY(
        i,
        (Math.sin(x * 0.28 + t * 0.9) +
          Math.sin(z * 0.22 + t * 0.7) +
          Math.sin((x + z) * 0.16 + t * 1.2)) *
          WAVE_AMPLITUDE
      );
    }
    pos.needsUpdate = true;
  }
}
