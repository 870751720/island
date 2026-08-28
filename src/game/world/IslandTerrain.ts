import * as THREE from 'three';

/** 简单可复现的 2D 值噪声(伪随机格点 + 平滑插值) */
function createNoise(seed: number) {
  const hash = (x: number, y: number) => {
    const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = smooth(x - xi);
    const yf = smooth(y - yi);
    const a = hash(xi, yi);
    const b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1);
    const d = hash(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}

const SAND = new THREE.Color('#e8d8a0');
const GRASS = new THREE.Color('#7cb45b');
const DARK_GRASS = new THREE.Color('#4d8a3d');

export class IslandTerrain {
  readonly mesh: THREE.Mesh;
  readonly size: number;
  private heightAt: (x: number, z: number) => number;

  constructor(size = 160, seed = Math.random() * 1000) {
    this.size = size;
    const noise = createNoise(seed);
    const half = size / 2;
    // 噪声频率随尺寸缩放,大岛也能同时有大海湾与内陆起伏
    const f1 = 6 / size;
    const f2 = 18 / size;
    // 岛屿高度:多层噪声叠起伏,圆形衰减保证边缘沉入海面
    this.heightAt = (x: number, z: number) => {
      const dist = Math.sqrt(x * x + z * z) / half;
      const falloff = Math.max(0, 1 - dist * dist);
      const h = noise(x * f1, z * f1) * 4 + noise(x * f2, z * f2) * 1.1;
      return falloff * falloff * h - 0.6;
    };

    // 顶点间距约 1.8,大岛保持低面数(flatShading 下视觉无损)
    const segments = Math.round(size / 1.8);
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.heightAt(x, z);
      pos.setY(i, y);
      // 按高度着色:近水沙滩 → 草地 → 深色草地
      const c = y < 0.05 ? SAND : y < 1.8 ? GRASS : DARK_GRASS;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 1,
      })
    );
    this.mesh.receiveShadow = true;
  }

  getHeight(x: number, z: number): number {
    return this.heightAt(x, z);
  }

  /** 找到中心附近的一块陆地作为出生点 */
  findSpawnPoint(): THREE.Vector3 {
    const r = this.size / 2;
    for (let radius = 0; radius < r; radius += 4) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        const x = Math.cos(a) * radius;
        const z = Math.sin(a) * radius;
        if (this.heightAt(x, z) > 0.5) return new THREE.Vector3(x, this.heightAt(x, z), z);
      }
    }
    return new THREE.Vector3(0, this.heightAt(0, 0), 0);
  }
}
