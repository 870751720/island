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

/** 近岸抬升带宽:低于草线的低平地向岛内最多延伸这么多米 */
const BEACH_WIDTH = 8;
/** 近岸抬升的满额高度:压过岛内噪声低谷,使 8 米外地面稳定高于草线 */
const BEACH_RISE = 2.6;

const SAND = new THREE.Color('#e8d8a0');const GRASS = new THREE.Color('#7cb45b');
const DARK_GRASS = new THREE.Color('#4d8a3d');
/** 水下的湿沙:沙色加深偏棕,不出现蓝色;随水深再向深棕渐变以区分浅滩与深水 */
const WET_SAND = SAND.clone().lerp(new THREE.Color('#8f7f52'), 0.55);
const DEEP_SEABED = new THREE.Color('#5d5238');
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
  /** 岛屿东西向(短轴)宽度 */
  readonly width: number;
  /** 岛屿南北向(长轴)长度 */
  readonly length: number;
  readonly halfWidth: number;
  readonly halfLength: number;
  private heightAt: (x: number, z: number) => number;

  constructor(width = 160, length = 800, seed = Math.random() * 1000) {
    this.width = width;
    this.length = length;
    const hw = width / 2;
    const hl = length / 2;
    this.halfWidth = hw;
    this.halfLength = hl;
    const noise = createNoise(seed);
    // 噪声波长按短轴宽度取,长条岛上地形起伏的颗粒感与旧圆形岛一致
    const f1 = 6 / width;
    const f2 = 18 / width;

    // 海岸线扰动:直接按空间坐标采样多尺度噪声,长条岛长边也有连续的凹凸变化
    // (按极角采样会让 800 米长边落在极窄角度区间内,呈现规整直线)
    const coastWobble = (x: number, z: number) => {
      const f = 2.4 / width;
      const n1 = noise(x * f + 7, z * f + 13);
      const n2 = noise(x * f * 3.1 + 31, z * f * 3.1 + 17);
      const n3 = noise(x * f * 7.7 + 59, z * f * 7.7 + 23);
      return 1 + (n1 - 0.5) * 0.24 + (n2 - 0.5) * 0.12 + (n3 - 0.5) * 0.06;
    };

    const baseHeight = (x: number, z: number) => {
      // 基准椭圆按最大扰动幅度向外扩(wob 下限约 0.79),保证扰动后的海岸(wob 最大处)仍在地形平面内
      const shrink = 0.75;
      const wob = coastWobble(x, z);
      const nd = Math.sqrt((x * x) / (hw * hw) + (z * z) / (hl * hl)) / shrink;
      const dist = nd * wob;
      // 到海岸(dist=1 等值线)的真实米数符号距离近似,内侧为正:
      // 归一化椭圆的梯度在长轴两端对应几百米真实距离,若直接用它做坡度,
      // 岛两端的低平地/沙滩会拉到几十米宽;换成实距后各段海岸过渡同宽
      const grad = Math.max(
        1e-4,
        (wob * Math.hypot(x / (hw * hw), z / (hl * hl))) / (Math.max(nd, 1e-4) * shrink)
      );
      const shoreDist = (1 - dist) / grad;
      const falloff = Math.max(0, 1 - dist * dist);
      const h = noise(x * f1, z * f1) * 4 + noise(x * f2, z * f2) * 1.1;
      // 近岸下坡陡度用噪声调制:水线与浅滩边界宽窄不一(不规整),且始终不缓于基准
      const shoreSteep = 1.1 + noise(x * f2 + 91, z * f2 + 45) * 0.8;
      // 岛外海底逐渐加深到约 -2.1,保证外海水深足够进入游泳;
      // 下压偏移随 falloff 淡出,使内陆噪声低谷不低于海平面,避免出现无法交互的内陆积水
      const f2sq = falloff * falloff;
      // 近岸实距抬升:水线向内 BEACH_WIDTH 米内抬到 BEACH_RISE,
      // 保证低于草线(0.05)的低平地不向岛内延伸超过 BEACH_WIDTH
      const ramp = THREE.MathUtils.clamp(shoreDist / BEACH_WIDTH, 0, 1);
      return (
        f2sq * h -
        0.6 * (1 - f2sq) -
        (1 - falloff) * (1 - falloff) * 1.5 * shoreSteep +
        BEACH_RISE * ramp
      );
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
        opacity: 0.65,
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

    // 内陆水洼:数量随岛屿面积(按需求收缩为原来的 1/3),间距与短轴挂钩,不写死上限
    const maxPonds = THREE.MathUtils.clamp(Math.round((width * length) / 9600), 2, 20);
    const minPondGap = Math.max(18, width / 8);
    for (let i = 0; i < maxPonds * 30 && this.countPonds() < maxPonds; i++) {
      const x = (rng(i * 2 + 1) * 2 - 1) * hw * 0.55;
      const z = (rng(i * 2 + 2) * 2 - 1) * hl * 0.55;
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
      const h = baseHeight(x, z) - carve;
      // 洼底不得低于海平面,否则全局海水平面会切进水洼内,露出蓝色积水
      return carve > 0 ? Math.max(h, this.seaLevel + 0.1) : h;
    };

    // 顶点间距约 1.8,大岛保持低面数(flatShading 下视觉无损)
    const segW = Math.round(width / 1.8);
    const segL = Math.round(length / 1.8);
    const segments = Math.max(segW, segL);
    const geometry = new THREE.PlaneGeometry(width, length, segW, segL);
    geometry.rotateX(-Math.PI / 2);
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const vertexHeights = new Float32Array(pos.count);
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.heightAt(x, z);
      vertexHeights[i] = y;
      pos.setY(i, y);
      const waterY = this.waterLevelAt(x, z);
      let c: THREE.Color;
      if (y < waterY - 0.02) {
        // 水下湿沙,越深越暗:浅水透出亮湿沙,深水显深色底
        c = WET_SAND.clone().lerp(DEEP_SEABED, THREE.MathUtils.clamp((waterY - y) / 2, 0, 1));
      } else {
        c = y < 0.05 ? SAND : y < 1.8 ? GRASS : DARK_GRASS;
      }
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    // 玩法高度按渲染网格的两个三角形插值。此前继续使用连续噪声函数，
    // 而屏幕上看到的是约 1.8m 间距的三角网格，水岸视觉与判定因此错位。
    const stride = segW + 1;
    const cellX = width / segW;
    const cellZ = length / segL;
    this.heightAt = (x: number, z: number) => {
      if (Math.abs(x) > hw || Math.abs(z) > hl) return -2.1;
      const gx = THREE.MathUtils.clamp((x + hw) / cellX, 0, segW);
      const gz = THREE.MathUtils.clamp((z + hl) / cellZ, 0, segL);
      const ix = Math.min(Math.floor(gx), segW - 1);
      const iz = Math.min(Math.floor(gz), segL - 1);
      const u = gx - ix;
      const v = gz - iz;
      const a = vertexHeights[iz * stride + ix];
      const b = vertexHeights[(iz + 1) * stride + ix];
      const c = vertexHeights[(iz + 1) * stride + ix + 1];
      const d = vertexHeights[iz * stride + ix + 1];
      return u + v <= 1
        ? a + u * (d - a) + v * (b - a)
        : c + (1 - u) * (b - c) + (1 - v) * (d - c);
    };

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

  /** 玩家是否处于海面水平 range 米范围内(只看海,不含水洼) */
  isNearSea(pos: THREE.Vector3, range: number): boolean {
    const steps = 12;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      for (let r = 0.75; r <= range + 0.001; r += 0.75) {
        const x = pos.x + Math.cos(a) * r;
        const z = pos.z + Math.sin(a) * r;
        if (this.getHeight(x, z) < this.seaLevel) return true;
      }
    }
    return false;
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

  /** 该点实际被玩法视作哪种水体；null 表示地面没有没入水面。 */
  getWaterKind(x: number, z: number): 'sea' | 'pond' | null {
    const pond = this.waterAreas.find(
      (w) => Math.hypot(x - w.x, z - w.z) < w.radius * 0.96
    );
    const waterY = pond?.waterY ?? this.seaLevel;
    if (this.getHeight(x, z) >= waterY - 0.02) return null;
    return pond ? 'pond' : 'sea';
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

  /** 出生点固定在岛最南端(+z 为屏幕下方):从南端海岸向岛内扫,找第一处水线上方的干地 */
  findSpawnPoint(): THREE.Vector3 {
    for (let z = this.halfLength - 2; z > 0; z -= 1) {
      for (let x = 0; x < this.halfWidth; x += 1) {
        for (const sx of x === 0 ? [0] : [x, -x]) {
          const h = this.heightAt(sx, z);
          if (h > 0.1 && !this.isInWater(new THREE.Vector3(sx, h, z))) {
            return new THREE.Vector3(sx, h, z);
          }
        }
      }
    }
    return new THREE.Vector3(0, this.heightAt(0, 0), 0);
  }
}
