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
const SEA_LEVEL = -0.35;

/** 一处下挖的水域:圆形 carve + 水面圆盘 */
type WaterArea = {
  x: number;
  z: number;
  radius: number;
  depth: number;
  waterY: number;
};

export class IslandTerrain {
  readonly mesh: THREE.Mesh;
  readonly waterGroup = new THREE.Group();
  /** 全部水面区域(水洼+河流),供资源生成等避让 */
  readonly waterAreas: WaterArea[] = [];
  readonly size: number;
  private heightAt: (x: number, z: number) => number;

  constructor(size = 160, seed = Math.random() * 1000) {
    this.size = size;
    const noise = createNoise(seed);
    const half = size / 2;
    const f1 = 6 / size;
    const f2 = 18 / size;

    const baseHeight = (x: number, z: number) => {
      const dist = Math.sqrt(x * x + z * z) / half;
      const falloff = Math.max(0, 1 - dist * dist);
      const h = noise(x * f1, z * f1) * 4 + noise(x * f2, z * f2) * 1.1;
      return falloff * falloff * h - 0.6;
    };

    const rng = (i: number) => {
      const n = Math.sin(seed * 13.7 + i * 391.3) * 43758.5453;
      return n - Math.floor(n);
    };
    const waterMat = () =>
      new THREE.MeshStandardMaterial({
        color: '#4aa3c7',
        roughness: 0.3,
        metalness: 0.1,
        transparent: true,
        opacity: 0.9,
      });
    const addWater = (area: WaterArea) => {
      this.waterAreas.push(area);
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(area.radius * 0.96, 24),
        waterMat()
      );
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(area.x, area.waterY, area.z);
      this.waterGroup.add(disc);
    };

    // 内陆水洼:数量随岛屿面积,间距与尺寸挂钩,不写死上限
    const maxPonds = THREE.MathUtils.clamp(Math.round((size * size) / 3200), 3, 14);
    const minPondGap = Math.max(18, size / 8);
    for (let i = 0; i < size && this.countPonds() < maxPonds; i++) {
      const x = (rng(i * 2 + 1) * 2 - 1) * half * 0.55;
      const z = (rng(i * 2 + 2) * 2 - 1) * half * 0.55;
      const y = baseHeight(x, z);
      if (y < 1.0) continue;
      if (this.tooClose(x, z, minPondGap)) continue;
      addWater({
        x,
        z,
        radius: 3.5 + rng(i + 100) * 3,
        depth: 1.6,
        waterY: y - 0.5,
      });
    }

    // 一条河流:从最靠岛心的水洼出发,蜿蜒向外挖入海(最多一条)
    const origin = this.nearestPondToCenter();
    if (origin) {
      const angle = Math.atan2(origin.z, origin.x);
      const wob = rng(999) * Math.PI * 2;
      const wobble = 2 + rng(998) * 2;
      for (let step = 1; ; step++) {
        const along = step * 1.8;
        const side = Math.sin(along * 0.12 + wob) * wobble;
        const x = Math.cos(angle) * (Math.hypot(origin.x, origin.z) + along) - Math.sin(angle) * side;
        const z = Math.sin(angle) * (Math.hypot(origin.x, origin.z) + along) + Math.cos(angle) * side;
        const dist = Math.hypot(x, z);
        // 挖到海岸之外即止
        if (dist > half) break;
        const h = baseHeight(x, z);
        // 河床挖到海平面之下,河面与海平面同高
        if (h > SEA_LEVEL - 0.4) {
          addWater({
            x,
            z,
            radius: 2.0,
            depth: h + 0.8,
            waterY: SEA_LEVEL + 0.02,
          });
        }
        if (step > size) break;
      }
    }

    // 岛屿高度:噪声地形 + 水域 carve
    this.heightAt = (x: number, z: number) => {
      let carve = 0;
      for (const w of this.waterAreas) {
        const d = Math.hypot(x - w.x, z - w.z) / w.radius;
        if (d < 1) carve += w.depth * (1 - d * d);
      }
      return baseHeight(x, z) - carve;
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

  private countPonds(): number {
    // 水洼的 waterY 高于海平面,河流与海同高
    return this.waterAreas.filter((w) => w.waterY > 0).length;
  }

  private tooClose(x: number, z: number, gap: number): boolean {
    return this.waterAreas.some((w) => Math.hypot(x - w.x, z - w.z) < gap + w.radius);
  }

  private nearestPondToCenter(): WaterArea | null {
    const ponds = this.waterAreas.filter((w) => w.waterY > 0);
    if (!ponds.length) return null;
    return ponds.reduce((a, b) =>
      Math.hypot(a.x, a.z) < Math.hypot(b.x, b.z) ? a : b
    );
  }

  /** 玩家是否处于任意水面附近(喝水判定) */
  isNearWater(pos: THREE.Vector3, extraRange: number): boolean {
    return this.waterAreas.some(
      (w) => Math.hypot(pos.x - w.x, pos.z - w.z) < w.radius + extraRange
    );
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
