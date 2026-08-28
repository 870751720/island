import * as THREE from 'three';

const SEA_LEVEL = -0.35;
const TIDE_AMPLITUDE = 0.12; // 潮汐涨落幅度
const TIDE_PERIOD = 120; // 一个潮汐周期(秒)
const WAVE_AMPLITUDE = 0.1;
const SHALLOW_COLOR = new THREE.Color('#7fd0c0');
const DEEP_COLOR = new THREE.Color('#4aa3c7');
const SHALLOW_DEPTH = 1.5; // 浅水渐变深度

/** 海面:低多边形波动的平面,水平面随潮汐缓慢涨落;近岸浅水偏绿 */
export class Ocean {
  readonly mesh: THREE.Mesh;
  private baseXZ: Float32Array;
  private baseY: number;
  private rising = true;

  constructor(size = 400, heightAt?: (x: number, z: number) => number) {
    const segments = 56;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    // 保存原始网格坐标,每帧在其上叠加波浪
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    this.baseXZ = new Float32Array(pos.array as Float32Array);
    if (heightAt) {
      // 按地形深度烘顶点色:近岸浅绿、深处蓝
      const colors = new Float32Array(pos.count * 3);
      const c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const depth = SEA_LEVEL - heightAt(this.baseXZ[i * 3], this.baseXZ[i * 3 + 2]);
        c.copy(SHALLOW_COLOR).lerp(
          DEEP_COLOR,
          THREE.MathUtils.smoothstep(depth, 0, SHALLOW_DEPTH)
        );
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: heightAt ? '#ffffff' : '#4aa3c7',
        vertexColors: !!heightAt,
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

  /** 当前潮位(海平面高度) */
  get waterY(): number {
    return this.mesh.position.y;
  }

  /** 是否正在涨潮 */
  get isRising(): boolean {
    return this.rising;
  }

  /** elapsed 为游戏累计时间(秒) */
  update(elapsed: number): void {
    const phase = (elapsed / TIDE_PERIOD) * Math.PI * 2;
    // 涨潮退潮:水平面缓慢升降,沙滩上的水线随之进退
    this.mesh.position.y = this.baseY + Math.sin(phase) * TIDE_AMPLITUDE;
    this.rising = Math.cos(phase) > 0;

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
