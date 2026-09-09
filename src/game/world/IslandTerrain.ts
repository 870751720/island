import * as THREE from 'three';
import { getSnowAmount, patchSnowMaterial } from './SeasonSnow';

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
const BEACH_WIDTH = 22;
/** 近岸抬升的满额高度:压过岛内噪声低谷,使 8 米外地面稳定高于草线 */
const BEACH_RISE = 2.6;

/** 近岸垂向压缩系数范围:水线以上的近岸高度按该系数向水线压扁,越小沙滩越宽 */
const BEACH_FLATTEN_MIN = 0.16;
const BEACH_FLATTEN_MAX = 0.38;
/** 压缩淡出区间(岸内米数):超过后恢复原始高度,避免削平岛内丘陵 */
const BEACH_FLATTEN_FADE_START = 20;
const BEACH_FLATTEN_FADE_END = 32;
/** 水下岸坡恢复宽度范围(米):下坡项从满额深度向岛内恢复完的距离,决定湿沙带宽(约 5~15 米) */
const SHORE_DESCENT_MIN = 30;
const SHORE_DESCENT_MAX = 56;

const SAND = new THREE.Color('#e8d8a0');const GRASS = new THREE.Color('#7cb45b');
const DARK_GRASS = new THREE.Color('#4d8a3d');
/** 草地内的小块裸露泥地 */
const DIRT = new THREE.Color('#8a6f4d');
/** 水下的湿沙:沙色加深偏棕,不出现蓝色;随水深再向深棕渐变以区分浅滩与深水 */
const WET_SAND = SAND.clone().lerp(new THREE.Color('#8f7f52'), 0.55);
const DEEP_SEABED = new THREE.Color('#5d5238');
/** 一处下挖的水域:椭圆 carve + 角向波动形成不规则形状,水面为同形状的圆盘 */
export type WaterArea = {
  x: number;
  z: number;
  /** 外接圆半径(最长方向的边界),供避让/外围生成等粗略判定使用 */
  radius: number;
  /** 椭圆半轴(长短不一形成扁圆/长条形) */
  rx: number;
  rz: number;
  /** 椭圆朝向(弧度) */
  rot: number;
  /** 角向半径波动系数:边界半径按 1 + a2·sin(2θ+p2) + a3·sin(3θ+p3) + a4·sin(4θ+p4) 起伏 */
  wobA2: number;
  wobP2: number;
  wobA3: number;
  wobP3: number;
  wobA4: number;
  wobP4: number;
  depth: number;
  waterY: number;
  /** 入雪后是否会结冰(由种子确定性决定,主客一致) */
  freezable: boolean;
};

export class IslandTerrain {
  readonly mesh: THREE.Mesh;
  readonly waterGroup = new THREE.Group();
  /** 结冰水洼的冰面圆盘(仅 freezable 水洼有,透明度随雪量驱动) */
  readonly iceGroup = new THREE.Group();
  /** 全部水面区域(水洼),供资源生成等避让 */
  readonly waterAreas: WaterArea[] = [];
  /** 岛屿东西向(短轴)宽度 */
  readonly width: number;
  /** 岛屿南北向(长轴)长度 */
  readonly length: number;
  readonly halfWidth: number;
  readonly halfLength: number;
  private heightAt: (x: number, z: number) => number;

  constructor(width = 200, length = 1000, seed = Math.random() * 1000) {
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
      // 水下岸坡按真实米数恢复:下坡深度在岸内 SHORE_DESCENT_MIN~MAX 米内 smoothstep 恢复到 0,
      // 水线到 2 米深的湿沙带宽度由此直接决定(约 5~15 米,各段海岸一致);
      // 此前用 falloff(归一化距离)控制,各段海岸换算速率不同导致湿沙带宽差异过大
      const descent =
        SHORE_DESCENT_MIN + noise(x * f2 * 0.4 + 301, z * f2 * 0.4 + 55) * (SHORE_DESCENT_MAX - SHORE_DESCENT_MIN);
      const shoreDown = 1.5 * shoreSteep * Math.pow(1 - THREE.MathUtils.smoothstep(shoreDist, 0, descent), 2);
      // 岛外海底逐渐加深到约 -2.1,保证外海水深足够进入游泳;
      // 下压偏移随 falloff 淡出,使内陆噪声低谷不低于海平面,避免出现无法交互的内陆积水
      const f2sq = falloff * falloff;
      // 近岸实距抬升:水线向内 BEACH_WIDTH 米内抬到 BEACH_RISE,
      // 保证低于草线(0.05)的低平地不向岛内延伸超过 BEACH_WIDTH
      const ramp = THREE.MathUtils.clamp(shoreDist / BEACH_WIDTH, 0, 1);
      const raw = f2sq * h - 0.6 * (1 - f2sq) - shoreDown + BEACH_RISE * ramp;
      // 干沙滩加宽:近岸(水线以上)高度按噪声调制的系数向水线压扁,坡度随之变缓,
      // 水线到草线的水平距离约 3~6 米;水下与淡出区外完全不变
      const flatten =
        BEACH_FLATTEN_MIN +
        noise(x * f2 + 201, z * f2 + 77) * (BEACH_FLATTEN_MAX - BEACH_FLATTEN_MIN);
      const flat =
        raw < this.seaLevel ? raw : this.seaLevel + (raw - this.seaLevel) * flatten;
      const fade = THREE.MathUtils.smoothstep(
        shoreDist,
        BEACH_FLATTEN_FADE_START,
        BEACH_FLATTEN_FADE_END
      );
      return flat + (raw - flat) * fade;
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
    // 冰面材质全场共享,透明度随雪量在 updateWater 中驱动
    const iceMat = new THREE.MeshStandardMaterial({
      color: '#cfe4ee',
      roughness: 0.25,
      metalness: 0.05,
      transparent: true,
      opacity: 0,
    });
    // 水洼水面/冰面共用的圆盘轮廓(与 carve 边界一致,shrink 略收缩避免边缘穿出洼坑)
    const pondShape = (area: WaterArea, shrink: number) => {
      const shape = new THREE.Shape();
      const steps = 48;
      for (let s = 0; s <= steps; s++) {
        const a = (s / steps) * Math.PI * 2;
        const r = this.pondBoundary(area, a) * shrink;
        const ca = Math.cos(area.rot);
        const sa = Math.sin(area.rot);
        const lx = Math.cos(a) * r;
        const lz = Math.sin(a) * r;
        // Shape 的 y 轴经 rotateX(-π/2) 后映射到世界的 -z
        const px = lx * ca - lz * sa;
        const pz = lx * sa + lz * ca;
        if (s === 0) shape.moveTo(px, -pz);
        else shape.lineTo(px, -pz);
      }
      return shape;
    };
    const addWater = (area: WaterArea) => {
      this.waterAreas.push(area);
      const disc = new THREE.Mesh(new THREE.ShapeGeometry(pondShape(area, 0.96)), waterMat());
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(area.x, area.waterY, area.z);
      disc.userData.baseY = area.waterY;
      disc.userData.freezable = area.freezable;
      this.waterGroup.add(disc);
      if (area.freezable) {
        // 冰盘比水盘略大(盖满洼坑边缘)且抬高,避免与浮动水面共面闪烁
        const ice = new THREE.Mesh(new THREE.ShapeGeometry(pondShape(area, 0.985)), iceMat);
        ice.rotation.x = -Math.PI / 2;
        ice.position.set(area.x, area.waterY + 0.05, area.z);
        ice.receiveShadow = true;
        this.iceGroup.add(ice);
      }
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
      // 形状随机化:长半轴 4.9~11.3(面积下限与上限分别调至原版的 2 倍与 1.5 倍),长短轴比与朝向决定胖瘦,
      // 三频角向波动让边界明显不规则;radius 记外接圆半径供避让等粗略判定
      const rx = 4.9 + rng(i + 100) * 6.4;
      const ratio = 0.35 + rng(i + 200) * 0.6;
      const wobA2 = (rng(i + 300) * 2 - 1) * 0.22;
      const wobA3 = (rng(i + 400) * 2 - 1) * 0.22;
      const wobA4 = (rng(i + 900) * 2 - 1) * 0.14;
      addWater({
        x,
        z,
        rx,
        rz: rx * ratio,
        rot: rng(i + 500) * Math.PI,
        wobA2,
        wobP2: rng(i + 600) * Math.PI * 2,
        wobA3,
        wobP3: rng(i + 700) * Math.PI * 2,
        wobA4,
        wobP4: rng(i + 800) * Math.PI * 2,
        radius: rx * (1 + Math.abs(wobA2) + Math.abs(wobA3) + Math.abs(wobA4)),
        depth: 1.6,
        waterY: y - 0.5,
        // 约 6 成水洼入雪结冰(同种子下主客一致)
        freezable: rng(i + 950) < 0.6,
      });
    }

    // 岛屿高度:噪声地形 + 水域 carve
    this.heightAt = (x: number, z: number) => {
      let carve = 0;
      for (const w of this.waterAreas) {
        const d = this.pondDist(w, x, z);
        if (d < 1) carve += w.depth * (1 - d * d);
      }
      let h = baseHeight(x, z) - carve;
      // 草地微起伏:±10cm 高频噪声打破大平面;该函数的采样结果即渲染顶点高度,视觉与玩法天然一致
      const micro = (noise(x * (100 / width) + 801, z * (100 / width) + 409) - 0.5) * 0.2;
      h += micro;
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
        // 陆地:沙滩按高度向草色平滑过渡;草地色斑用约 16 米的大尺度噪声,
        // smoothstep 锐化让浅草/深草整片切换、颜色始终饱和不掺灰;
        // 噪声极大值处成片露出泥地,且只出现在地势较低的草地上
        const patch = noise(x * (12 / width) + 401, z * (12 / width) + 87);
        const grass = GRASS.clone().lerp(
          DARK_GRASS,
          THREE.MathUtils.smoothstep(patch, 0.5, 0.7) * 0.9
        );
        if (y < 2.2) grass.lerp(DIRT, THREE.MathUtils.smoothstep(patch, 0.78, 0.9));
        c = SAND.clone().lerp(grass, THREE.MathUtils.smoothstep(y, 0.05, 1.2));
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
      (() => {
        const mat = new THREE.MeshStandardMaterial({
          vertexColors: true,
          flatShading: true,
          roughness: 1,
        });
        patchSnowMaterial(mat);
        return mat;
      })()
    );
    this.mesh.receiveShadow = true;
  }

  /** 水洼在局部角度方向的水面边界半径(米):供水生表现等贴合不规则形状 */
  pondEdgeRadius(w: WaterArea, localAngle: number): number {
    return this.pondBoundary(w, localAngle);
  }

  private countPonds(): number {
    return this.waterAreas.length;
  }

  /** 水洼在某局部角度下的边界半径(米):椭圆 + 角向正弦波动 */
  private pondBoundary(w: WaterArea, a: number): number {
    const ellipse =
      1 / Math.sqrt((Math.cos(a) / w.rx) ** 2 + (Math.sin(a) / w.rz) ** 2);
    return (
      ellipse *
      (1 +
        w.wobA2 * Math.sin(2 * a + w.wobP2) +
        w.wobA3 * Math.sin(3 * a + w.wobP3) +
        w.wobA4 * Math.sin(4 * a + w.wobP4))
    );
  }

  /** 点到水洼的归一化距离:按形状边界折算,<1 在洼内,=1 在边界 */
  private pondDist(w: WaterArea, x: number, z: number): number {
    const dx = x - w.x;
    const dz = z - w.z;
    const ca = Math.cos(w.rot);
    const sa = Math.sin(w.rot);
    const lx = dx * ca + dz * sa;
    const lz = -dx * sa + dz * ca;
    const len = Math.hypot(lx, lz);
    return len / this.pondBoundary(w, Math.atan2(lz, lx));
  }

  private tooClose(x: number, z: number, gap: number): boolean {
    return this.waterAreas.some((w) => Math.hypot(x - w.x, z - w.z) < gap + w.radius);
  }

  /** 雪量达到该值后可冻水洼完全结冰(冰面在此前已随雪量逐渐显形) */
  static readonly FREEZE_SNOW = 0.7;

  /** 水洼的轻微浮动与呼吸,elapsed 为游戏累计时间(秒);同时驱动冰面随雪量显隐 */
  updateWater(elapsed: number): void {
    const ice = THREE.MathUtils.clamp((getSnowAmount() - 0.4) / 0.3, 0, 1);
    this.waterGroup.children.forEach((child, i) => {
      const disc = child as THREE.Mesh;
      // 可冻水洼随冰面渐显把水面淡出并停掉浮动,避免冰水两盘交叠闪烁
      const waterMat = disc.material as THREE.MeshStandardMaterial;
      const frozen = disc.userData.freezable ? ice : 0;
      if (frozen > 0) {
        waterMat.opacity = 0.65 * (1 - frozen);
        disc.visible = frozen < 0.98;
        if (!disc.visible) return;
      }
      disc.position.y = disc.userData.baseY + Math.sin(elapsed * 1.1 + i * 1.7) * 0.02;
      const s = 1 + Math.sin(elapsed * 0.8 + i * 2.3) * 0.012;
      disc.scale.setScalar(s);
    });
    this.iceGroup.visible = ice > 0;
    if (this.iceGroup.visible) {
      const first = this.iceGroup.children[0] as THREE.Mesh | undefined;
      const mat = first?.material as THREE.MeshStandardMaterial | undefined;
      if (mat) mat.opacity = ice * 0.95;
    }
  }

  /** 该点的水洼是否已结冰(雪量达标且该洼可冻);返回冰面即洼面高度 */
  private frozenPondAt(x: number, z: number): WaterArea | null {
    if (getSnowAmount() < IslandTerrain.FREEZE_SNOW) return null;
    const pond = this.waterAreas.find((w) => w.freezable && this.pondDist(w, x, z) < 0.96);
    return pond ?? null;
  }

  /** 该点是否站在结冰冰面上(供冰面加速滑行等玩法判定) */
  isOnIce(x: number, z: number): boolean {
    return this.frozenPondAt(x, z) !== null;
  }

  /** 玩家是否处于任意水面附近(喝水判定) */
  isNearWater(pos: THREE.Vector3, extraRange: number): boolean {
    return this.waterAreas.some(
      (w) =>
        Math.hypot(pos.x - w.x, pos.z - w.z) < w.radius + extraRange &&
        this.pondDist(w, pos.x, pos.z) < 1 + extraRange / w.radius
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

  /** 玩家是否处于水洼范围内(在水里,喝水判定排除,游泳复用);边界对齐可见水面形状 */
  isInWater(pos: THREE.Vector3): boolean {
    return this.waterAreas.some((w) => this.pondDist(w, pos.x, pos.z) < 0.96);
  }

  /** 海面高度 */
  readonly seaLevel = -0.35;

  /** 某处的水面高度:在水洼内返回洼面,否则为海面 */
  getWaterLevel(x: number, z: number): number {
    return this.waterLevelAt(x, z);
  }

  /** 该点实际被玩法视作哪种水体；null 表示地面没有没入水面。 */
  getWaterKind(x: number, z: number): 'sea' | 'pond' | null {
    const pond = this.waterAreas.find((w) => this.pondDist(w, x, z) < 0.96);
    const waterY = pond?.waterY ?? this.seaLevel;
    if (this.getHeight(x, z) >= waterY - 0.02) return null;
    return pond ? 'pond' : 'sea';
  }

  private waterLevelAt(x: number, z: number): number {
    for (const w of this.waterAreas) {
      if (this.pondDist(w, x, z) < 0.96) return w.waterY;
    }
    return this.seaLevel;
  }

  getHeight(x: number, z: number): number {
    const h = this.heightAt(x, z);
    // 结冰水洼的可行走面是冰面(洼面高度);由此 getWaterKind 也返回 null,
    // 站上冰面既不游泳也不涉水,喝水/钓鱼判定自然失效
    const frozen = this.frozenPondAt(x, z);
    return frozen ? Math.max(h, frozen.waterY) : h;
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
