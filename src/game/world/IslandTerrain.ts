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
/** 水下的湿沙:沙色加深偏棕,不出现蓝色 */
const WET_SAND = SAND.clone().lerp(new THREE.Color('#8f7f52'), 0.55);
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
  /** 全部水面区域(水洼),供资源生成等避让 */
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
      // 岛外海底逐渐加深到约 -2.1,保证外海水深足够进入游泳
      return falloff * falloff * h - 0.6 - (1 - falloff) * (1 - falloff) * 1.5;
    };

    const rng = (i: number) => {
      const n = Math.sin(seed * 13.7 + i * 391.3) * 43758.5453;
      return n - Math.floor(n);
    };
    const waterMat = () =>
      new THREE.MeshStandardMaterial({
        color: '#4aa3c7',
        roughness: 0.35,
        metalness: 0.1,
        transparent: true,
        opacity: 0.92,
      });
    const addWater = (area: WaterArea) => {
      this.waterAreas.push(area);
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(area.radius * 0.96, 24),
        waterMat()
      );
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(area.x, area.waterY, area.z);
      disc.userData.baseY = area.waterY;
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
      const c =
        y < this.waterLevelAt(x, z) - 0.02
          ? WET_SAND
          : y < 0.05
            ? SAND
            : y < 1.8
              ? GRASS
              : DARK_GRASS;
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
    return this.waterAreas.length;
  }

  private tooClose(x: number, z: number, gap: number): boolean {
    return this.waterAreas.some((w) => Math.hypot(x - w.x, z - w.z) < gap + w.radius);
  }

  /** 水洼的轻微浮动与呼吸,elapsed 为游戏累计时间(秒) */
  updateWater(elapsed: number): void {
    this.waterGroup.children.forEach((disc, i) => {
      disc.position.y = disc.userData.baseY + Math.sin(elapsed * 1.1 + i * 1.7) * 0.02;
      const s = 1 + Math.sin(elapsed * 0.8 + i * 2.3) * 0.012;
      disc.scale.setScalar(s);
    });
  }

  /** 玩家是否处于任意水面附近(喝水判定) */
  isNearWater(pos: THREE.Vector3, extraRange: number): boolean {
    return this.waterAreas.some(
      (w) => Math.hypot(pos.x - w.x, pos.z - w.z) < w.radius + extraRange
    );
  }

  /** 玩家是否处于水洼范围内(在水里,喝水判定排除,游泳复用);边界对齐可见水面圆盘 */
  isInWater(pos: THREE.Vector3): boolean {
    return this.waterAreas.some(
      (w) => Math.hypot(pos.x - w.x, pos.z - w.z) < w.radius * 0.96
    );
  }

  /** 海面高度 */
  readonly seaLevel = -0.35;

  /** 某处的水面高度:在水洼内返回洼面,否则为海面 */
  getWaterLevel(x: number, z: number): number {
    return this.waterLevelAt(x, z);
  }

  private waterLevelAt(x: number, z: number): number {
    for (const w of this.waterAreas) {
      if (Math.hypot(x - w.x, z - w.z) < w.radius * 0.96) return w.waterY;
    }
    return this.seaLevel;
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
