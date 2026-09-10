import { mergeClayMeshes } from '../core/mergeClayMeshes';
import * as THREE from 'three';
import { FOODS, BOILABLE } from '../systems/Food';
import type { ResourceKind } from '../systems/Inventory';
import type { LightPool } from '../world/LightPool';

/** 火焰达到满簇满亮度的参考燃料秒数(表现用,与火堆同档) */
const FULL_FUEL = 210;
/** 每份汤品的煮制时长(秒) */
export const BOIL_INTERVAL = 5;
/** 燃着时的火光参数(向光源池领取;池满则本座无动态光照,火焰表现不受影响) */
const LIGHT_SPEC = { color: '#ff9d2e', intensity: 1.4, distance: 6, decay: 1.2 };

function clayMaterial(color: string, emissive = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 1,
    emissive: new THREE.Color(color),
    emissiveIntensity: emissive,
  });
}

/**
 * 烹饪台摆件:石座上支着铁锅,锅下烧火。添柴续火与火堆同理(fuel > 0 即燃烧);
 * 燃烧且锅里有食材时持续煮汤——锅身轻晃、汤面变色、热气腾腾;燃尽后火焰
 * 熄灭只剩灶台,添柴可复燃。煮制队列与产出由系统结算,外部只读字段并调 update。
 */
export class CookingStation {
  readonly group: THREE.Group;
  private flames: THREE.Mesh[] = [];
  private fireRoot: THREE.Group;
  private steam: { mesh: THREE.Mesh; offset: number }[] = [];
  private light: THREE.PointLight | null = null;
  private pot: THREE.Group;
  private soupMat: THREE.MeshStandardMaterial;
  /** 剩余燃烧秒数,> 0 即在燃烧 */
  fuel: number;
  /** 正在煮的食材(无则为 null) */
  boilKind: ResourceKind | null = null;
  /** 锅里剩余待煮份数 */
  boilQueue = 0;
  /** 当前这份的剩余煮制秒数 */
  tickLeft = BOIL_INTERVAL;
  /** 已煮好的汤品种类(无产出为 null) */
  outKind: ResourceKind | null = null;
  /** 台上存放的汤品数量(收取后清零) */
  outCount = 0;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    rotY: number,
    initialFuel: number,
    /** 火光光源池(不传则无动态光照,安放预览等表现场景用) */
    private lights?: LightPool
  ) {
    this.fuel = initialFuel;
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.rotation.y = rotY;

    // 石座
    const stoneMat = clayMaterial('#8d8a82');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), stoneMat);
      stone.position.set(Math.cos(a) * 0.6, 0.05, Math.sin(a) * 0.6);
      stone.rotation.set(0.3, a, 0.2);
      stone.castShadow = true;
      this.group.add(stone);
    }

    // 三脚铁架架着铁锅
    const ironMat = clayMaterial('#5c5f66');
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.05, 5), ironMat);
      leg.position.set(Math.cos(a) * 0.32, 0.5, Math.sin(a) * 0.32);
      leg.rotation.set(Math.sin(a) * 0.32, 0, -Math.cos(a) * 0.32);
      leg.castShadow = true;
      this.group.add(leg);
    }
    this.pot = new THREE.Group();
    this.pot.position.y = 0.78;
    const potBody = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.3, 0.34, 9), ironMat);
    potBody.castShadow = true;
    this.pot.add(potBody);
    this.soupMat = clayMaterial('#b5813f', 0.1);
    const soup = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 9), this.soupMat);
    soup.position.y = 0.17;
    this.pot.add(soup);
    this.group.add(this.pot);

    // 锅下火焰:三簇橙黄锥体,整组随燃料缩放
    this.fireRoot = new THREE.Group();
    this.fireRoot.position.y = 0.35;
    const flameColors = ['#ff9d2e', '#ffcf5e', '#ff6a2e'];
    for (let i = 0; i < 3; i++) {
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.13 - i * 0.02, 0.42 - i * 0.08, 5),
        clayMaterial(flameColors[i], 0.9)
      );
      const angle = (i / 3) * Math.PI * 2;
      flame.position.set(Math.cos(angle) * 0.14, 0.2, Math.sin(angle) * 0.14);
      this.flames.push(flame);
      this.fireRoot.add(flame);
    }
    this.group.add(this.fireRoot);

    // 腾起的热气:煮汤时三个错相循环上升的气团
    const steamMat = new THREE.MeshBasicMaterial({
      color: '#e8e2d4',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    for (let i = 0; i < 3; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), steamMat.clone());
      puff.visible = false;
      this.group.add(puff);
      this.steam.push({ mesh: puff, offset: i / 3 });
    }

    mergeClayMeshes(this.group, [this.pot, this.fireRoot, ...this.steam.map(({ mesh }) => mesh)]);
    this.group.position.y -= 0.05;
    scene.add(this.group);
    if (initialFuel > 0) {
      this.applyStage();
      this.light = this.lights?.claim(this.group.position, 0.9, LIGHT_SPEC) ?? null;
    } else this.extinguish();
  }

  get isLit(): boolean {
    return this.fuel > 0;
  }

  get isBoiling(): boolean {
    return this.isLit && this.boilKind !== null && this.boilQueue > 0;
  }

  /** 每帧表现:火焰摇曳、灯光呼吸、煮汤时锅身轻晃 + 汤色 + 热气(燃料消耗由系统结算) */
  update(elapsed: number): void {
    if (!this.isLit) return;
    const low = this.fuel < 12;
    const flickerSpeed = low ? 16 : 9;
    for (let i = 0; i < this.flames.length; i++) {
      const flicker = 1 + Math.sin(elapsed * flickerSpeed + i * 2.4) * (low ? 0.28 : 0.12);
      this.flames[i].scale.set(flicker, 1 + Math.sin(elapsed * 12 + i) * 0.18, flicker);
    }
    const k = Math.min(this.fuel / FULL_FUEL, 1);
    const wobble = low ? Math.sin(elapsed * 18) * 0.9 : Math.sin(elapsed * 10) * 0.25;
    if (this.light) this.light.intensity = Math.max(1.2 + k * 4 + wobble, 0.3);
    this.updateBoilingFx(elapsed);
  }

  /** 煮汤特效:锅身咕嘟轻晃,汤面随食材变色,热气团循环上升淡出 */
  private updateBoilingFx(elapsed: number): void {
    const boiling = this.isBoiling;
    this.pot.rotation.z = boiling ? Math.sin(elapsed * 7) * 0.03 : 0;
    for (const { mesh, offset } of this.steam) {
      mesh.visible = boiling;
      if (!boiling) continue;
      const t = (elapsed * 0.3 + offset) % 1;
      mesh.position.set(
        Math.sin((elapsed + offset * 9) * 1.4) * 0.1 * t,
        1.05 + t * 1.1,
        0
      );
      mesh.scale.setScalar(0.5 + t * 1.7);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.3 * (1 - t) * Math.min(t * 4, 1);
    }
  }

  /** 燃料阶段表现:整团火焰随燃料收缩 */
  private applyStage(): void {
    const size = 0.5 + Math.min(this.fuel / FULL_FUEL, 1) * 1.2;
    this.fireRoot.scale.setScalar(size);
  }

  private extinguish(): void {
    for (const flame of this.flames) flame.visible = false;
    for (const { mesh } of this.steam) mesh.visible = false;
    if (this.light) {
      this.lights?.release(this.light);
      this.light = null;
    }
  }

  /** 复燃:添柴后恢复火焰表现 */
  relight(): void {
    for (const flame of this.flames) flame.visible = true;
    this.light = this.lights?.claim(this.group.position, 0.9, LIGHT_SPEC) ?? null;
    this.applyStage();
  }

  /** 开始煮制:记录食材并让汤面换成对应汤品颜色 */
  setBoiling(kind: ResourceKind): void {
    this.boilKind = kind;
    const soupKind = BOILABLE[kind];
    const soup = soupKind ? FOODS.find((f) => f.kind === soupKind) : undefined;
    this.soupMat.color.set(soup?.fxColor ?? '#b5813f');
    this.soupMat.emissive.set(this.soupMat.color);
  }

  /** 汤面颜色跟随煮好的产出(产出入存放时锅里的东西变成了汤) */
  setOutput(kind: ResourceKind): void {
    this.outKind = kind;
    this.soupMat.color.set(FOODS.find((f) => f.kind === kind)?.fxColor ?? '#b5813f');
    this.soupMat.emissive.set(this.soupMat.color);
  }

  /** 客人端/存档恢复:整体回放状态(燃料表现按燃/灭切换,汤色按产出优先) */
  netApply(state: {
    fuel: number;
    boilKind: ResourceKind | null;
    boilQueue: number;
    tickLeft: number;
    outKind: ResourceKind | null;
    outCount: number;
  }): void {
    const wasLit = this.isLit;
    this.fuel = Math.max(0, state.fuel);
    this.boilKind = state.boilKind;
    this.boilQueue = state.boilQueue;
    this.tickLeft = state.tickLeft;
    this.outKind = state.outKind;
    this.outCount = state.outCount;
    if (this.boilKind) this.setBoiling(this.boilKind);
    else if (this.outKind) this.setOutput(this.outKind);
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
