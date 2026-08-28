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

export type Pond = {
  x: number;
  z: number;
  radius: number;
  /** 喝水判定中心(水边) */
  position: THREE.Vector3;
};

export class IslandTerrain {
  readonly mesh: THREE.Mesh;
  readonly waterGroup = new THREE.Group();
  readonly ponds: Pond[] = [];
  readonly size: number;
  private heightAt: (x: number, z: number) => number;

  constructor(size = 160, seed = Math.random() * 1000) {
    this.size = size;
    const noise = createNoise(seed);
    const half = size / 2;
    // 噪声频率随尺寸缩放,大岛也能同时有大海湾与内陆起伏
    const f1 = 6 / size;
    const f2 = 18 / size;

    // 内陆水洼:随机挑几处高地挖圆形洼地,积水面略低于周边地面
    const rng = (i: number) => {
      const n = Math.sin(seed * 13.7 + i * 391.3) * 43758.5453;
      return n - Math.floor(n);
    };
    const baseHeight = (x: number, z: number) => {
      const dist = Math.sqrt(x * x + z * z) / half;
      const falloff = Math.max(0, 1 - dist * dist);
      const h = noise(x * f1, z * f1) * 4 + noise(x * f2, z * f2) * 1.1;
      return falloff * falloff * h - 0.6;
    };
    // 先定洼地位置,再定义最终高度函数(洼地处的原始地面高度用于确定水面)
    const attempts = 40;
    for (let i = 0; i < attempts && this.ponds.length < 5; i++) {
      const x = (rng(i * 2 + 1) * 2 - 1) * half * 0.5;
      const z = (rng(i * 2 + 2) * 2 - 1) * half * 0.5;
      const y = baseHeight(x, z);
      if (y < 1.0) continue;
      if (this.ponds.some((p) => Math.hypot(p.x - x, p.z - z) < p.radius + 14)) continue;
      const radius = 3.5 + rng(i + 100) * 3;
      const waterY = y - 0.5;
      this.ponds.push({ x, z, radius, position: new THREE.Vector3(x, waterY, z) });
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(radius * 0.96, 24),
        new THREE.MeshStandardMaterial({
          color: '#4aa3c7',
          roughness: 0.3,
          metalness: 0.1,
          transparent: true,
          opacity: 0.9,
        })
      );
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(x, waterY, z);
      this.waterGroup.add(disc);
    }

    // 岛屿高度:多层噪声叠起伏,圆形衰减保证边缘沉入海面,水洼处下挖
    this.heightAt = (x: number, z: number) => {
      const h = baseHeight(x, z);
      let carveDepth = 0;
      for (const pond of this.ponds) {
        const d = Math.hypot(x - pond.x, z - pond.z) / pond.radius;
        if (d < 1) carveDepth += (1 - d * d) * 1.6;
      }
      return h - carveDepth;
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
