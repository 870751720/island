import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import { GmSystem } from './GmSystem';

const DAY_LENGTH = 240; // 一整轮昼夜(秒,按白天流速计)
/** 夜晚时钟加速倍率:自然夜约 116 秒,加速后压到约 40 秒 */
const NIGHT_CLOCK_RATE = 2.9;

const SKY_DAY = new THREE.Color('#a8d8ea');
const SKY_DUSK = new THREE.Color('#e8a06a');
const SKY_NIGHT = new THREE.Color('#1a2744');

const SUN_DAY = new THREE.Color('#fff3d6');
const SUN_DUSK = new THREE.Color('#ffb36b');
const MOON_LIGHT = new THREE.Color('#7d9fd4');

export type DayPhase = 'day' | 'dusk' | 'night' | 'dawn';

/** 昼夜循环:驱动太阳/月光、天空色与环境光,t∈[0,1),0 为正午起点 */
export class DayNightSystem implements Updatable {
  private t = 0.1; // 从白天开始
  /** 太阳/月光相对玩家的方向偏移,由相机跟随逻辑叠加玩家坐标 */
  readonly sunOffset = new THREE.Vector3(25, 35, 15);
  readonly state: { phase: DayPhase; clock: string };

  constructor(
    private sun: THREE.DirectionalLight,
    private hemi: THREE.HemisphereLight,
    private scene: THREE.Scene
  ) {
    this.state = { phase: 'day', clock: '' };
    this.apply();
  }

  get isNight(): boolean {
    return this.sunElevation() < -0.05;
  }

  /** 当前昼夜时刻 t∈[0,1),供存档读取 */
  get time(): number {
    return this.t;
  }

  set time(t: number) {
    if (Number.isFinite(t)) {
      this.t = ((t % 1) + 1) % 1;
      this.apply();
    }
  }

  private sunElevation(): number {
    return Math.sin(this.t * Math.PI * 2);
  }

  update(delta: number): void {
    if (GmSystem.lockDaytime) {
      // 锁定白天:时间停在正午,若当前在夜里先拉回白天
      if (this.sunElevation() < 0.25) {
        this.t = 0.25;
        this.apply();
      }
      return;
    }
    // 夜里时钟加速,让自然夜(约 116 秒)压到约 40 秒;白天与晨昏仍按原速走
    const rate = this.sunElevation() < -0.05 ? NIGHT_CLOCK_RATE : 1;
    this.t = (this.t + (delta * rate) / DAY_LENGTH) % 1;
    this.apply();
  }

  private apply(): void {
    const elev = this.sunElevation();

    // 太阳绕 x-y 平面旋转,夜晚用对面方向的月光
    const theta = this.t * Math.PI * 2;
    if (elev >= -0.05) {
      this.sunOffset.set(Math.cos(theta) * 25, Math.max(elev, 0.05) * 35, 15);
    } else {
      this.sunOffset.set(-Math.cos(theta) * 25, Math.max(-elev, 0.05) * 35, -15);
    }
    this.sun.position.copy(this.sunOffset);
    this.sun.target.position.set(0, 0, 0);
    this.sun.target.updateMatrixWorld();

    const sky = new THREE.Color();
    const sunColor = new THREE.Color();
    if (elev > 0.25) {
      // 白天
      sky.copy(SKY_DAY);
      sunColor.copy(SUN_DAY);
      this.sun.intensity = 1.6;
      this.hemi.intensity = 0.9;
      this.state.phase = 'day';
    } else if (elev > -0.05) {
      // 黄昏/黎明:按高度在天空色与太阳色上做插值
      const k = THREE.MathUtils.smoothstep(elev, -0.05, 0.25);
      sky.lerpColors(SKY_DUSK, SKY_DAY, k);
      sunColor.lerpColors(SUN_DUSK, SUN_DAY, k);
      this.sun.intensity = THREE.MathUtils.lerp(0.5, 1.6, k);
      this.hemi.intensity = THREE.MathUtils.lerp(0.4, 0.9, k);
      this.state.phase = this.t < 0.5 ? 'dusk' : 'dawn';
    } else {
      // 夜晚
      const k = THREE.MathUtils.smoothstep(-elev, 0, 0.15);
      sky.lerpColors(SKY_DUSK, SKY_NIGHT, k);
      sunColor.copy(MOON_LIGHT);
      this.sun.intensity = THREE.MathUtils.lerp(0.5, 0.3, k);
      this.hemi.intensity = THREE.MathUtils.lerp(0.4, 0.25, k);
      this.state.phase = 'night';
    }

    this.sun.color.copy(sunColor);
    this.scene.background = sky;
    const hours = Math.floor(((this.t + 0.5) % 1) * 24);
    this.state.clock = `${String(hours).padStart(2, '0')}:00`;
  }
}
