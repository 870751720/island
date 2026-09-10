import * as THREE from 'three';
import { clayMaterial } from '../world/ClayMaterial';
import { sinkModel } from '../core/sinkModel';
import type { LightPool } from '../world/LightPool';

/** 炼出 1 块铁锭消耗的铁矿石数 */
export const SMELT_ORE_PER_INGOT = 3;

/** 火焰达到满簇满亮度的参考燃料秒数(表现用,与烹饪台同档) */
const FULL_FUEL = 210;
/** 燃着时的炉口火光参数(向光源池领取;池满则本炉无动态光照,火焰表现不受影响) */
const LIGHT_SPEC = { color: '#ff9d2e', intensity: 1.4, distance: 6, decay: 1.2 };

/** 火焰锥体材质:本色 + 自发光,与烹饪台火焰同款质感 */
function flameMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 1,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.9,
  });
}

/** 程序化拼装的冶炼炉模型:石砌炉身 + 炉门火口与炉顶排烟口 */
function makeSmelterMesh(): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = clayMaterial('#7d8288');
  const darkMat = clayMaterial('#4a4f55');

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.72, 7), stoneMat);
  body.position.y = 0.36;
  body.castShadow = true;
  g.add(body);

  // 炉顶收口
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 0.18, 7), darkMat);
  rim.position.y = 0.81;
  g.add(rim);

  // 炉门火口:燃着时发亮闪动,熄火后只剩黑口
  const fireMat = new THREE.MeshStandardMaterial({
    color: '#e8703a',
    emissive: new THREE.Color('#c0392b'),
    emissiveIntensity: 0.9,
    flatShading: true,
    roughness: 1,
  });
  const fire = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.05), fireMat);
  fire.position.set(0, 0.26, 0.4);
  fire.name = 'smelterFire';
  g.add(fire);

  return g;
}

/**
 * 场景中的冶炼炉摆件:添柴续火与烹饪台同理(fuel > 0 即燃烧);
 * 燃着且炉内矿石足够(≥3 块)时每 15 秒炼出 1 块铁锭。炉门口烧着一簇
 * 摇曳的火焰并透出动态火光;熄火后火口发暗、无光,添柴可复燃。
 */
export class Smelter {
  readonly group: THREE.Group;
  /** 剩余燃烧秒数,> 0 即在燃烧 */
  fuel: number;
  /** 炉内待冶炼的铁矿石数 */
  ore = 0;
  /** 已炼好待收取的铁锭数 */
  ingot = 0;
  /** 距离下一次出炉的剩余秒数(无矿石/熄火时为满值) */
  tickLeft = 0;
  private fire: THREE.Object3D | null = null;
  private flames: THREE.Mesh[] = [];
  private fireRoot: THREE.Group;
  private light: THREE.PointLight | null = null;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    rotY = 0,
    initialFuel = 0,
    /** 火光光源池(不传则无动态光照,安放预览等表现场景用) */
    private lights?: LightPool
  ) {
    this.fuel = initialFuel;
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.rotation.y = rotY;
    scene.add(this.group);
    const mesh = makeSmelterMesh();
    this.fire = mesh.getObjectByName('smelterFire') ?? null;
    this.group.add(mesh);

    // 炉门火口的火焰:三簇橙黄锥体,整组随燃料缩放
    this.fireRoot = new THREE.Group();
    this.fireRoot.position.set(0, 0.2, 0.42);
    const flameColors = ['#ff9d2e', '#ffcf5e', '#ff6a2e'];
    for (let i = 0; i < 3; i++) {
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.1 - i * 0.015, 0.32 - i * 0.06, 5),
        flameMaterial(flameColors[i])
      );
      const angle = (i / 3) * Math.PI * 2;
      flame.position.set(Math.cos(angle) * 0.08, 0.14, Math.sin(angle) * 0.02);
      flame.rotation.x = -0.25;
      this.flames.push(flame);
      this.fireRoot.add(flame);
    }
    this.group.add(this.fireRoot);

    sinkModel(this.group, 0.02);
    if (initialFuel > 0) {
      this.applyStage();
      this.light = this.lights?.claim(this.group.position, 0.7, LIGHT_SPEC) ?? null;
    } else this.extinguish();
  }

  get isLit(): boolean {
    return this.fuel > 0;
  }

  /** 是否正在冶炼(燃着且矿石足够) */
  get isSmelting(): boolean {
    return this.isLit && this.ore >= SMELT_ORE_PER_INGOT;
  }

  /** 每帧表现:燃着时火口闪动、火焰摇曳、灯光呼吸;燃料消耗由系统结算 */
  update(elapsed: number): void {
    if (!this.isLit) return;
    if (this.fire) {
      this.fire.visible = true;
      const mat = (this.fire as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.7 + Math.sin(elapsed * 6) * 0.25;
    }
    const low = this.fuel < 12;
    const flickerSpeed = low ? 16 : 9;
    for (let i = 0; i < this.flames.length; i++) {
      const flicker = 1 + Math.sin(elapsed * flickerSpeed + i * 2.4) * (low ? 0.28 : 0.12);
      this.flames[i].scale.set(flicker, 1 + Math.sin(elapsed * 12 + i) * 0.18, flicker);
    }
    const k = Math.min(this.fuel / FULL_FUEL, 1);
    const wobble = low ? Math.sin(elapsed * 18) * 0.9 : Math.sin(elapsed * 10) * 0.25;
    if (this.light) this.light.intensity = Math.max(1.2 + k * 4 + wobble, 0.3);
  }

  /** 燃料阶段表现:整团火焰随燃料收缩 */
  private applyStage(): void {
    const size = 0.5 + Math.min(this.fuel / FULL_FUEL, 1) * 1.2;
    this.fireRoot.scale.setScalar(size);
  }

  private extinguish(): void {
    if (this.fire) this.fire.visible = false;
    for (const flame of this.flames) flame.visible = false;
    if (this.light) {
      this.lights?.release(this.light);
      this.light = null;
    }
  }

  /** 复燃:添柴后恢复火口与火焰表现 */
  relight(): void {
    for (const flame of this.flames) flame.visible = true;
    this.light = this.lights?.claim(this.group.position, 0.7, LIGHT_SPEC) ?? null;
    this.applyStage();
  }

  /** 客人端/存档恢复:整体回放状态(燃料表现按燃/灭切换) */
  netApply(state: { fuel: number; ore: number; ingot: number; tickLeft: number }): void {
    const wasLit = this.isLit;
    this.fuel = Math.max(0, state.fuel);
    this.ore = state.ore;
    this.ingot = state.ingot;
    this.tickLeft = state.tickLeft;
    if (!this.isLit) {
      if (wasLit) this.extinguish();
      return;
    }
    if (wasLit) this.applyStage();
    else this.relight();
  }

  dispose(): void {
    if (this.light) {
      this.lights?.release(this.light);
      this.light = null;
    }
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
  }
}
