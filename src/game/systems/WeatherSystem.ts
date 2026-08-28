import * as THREE from 'three';

export type WeatherType = 'sunny' | 'rain';

const MIN_DURATION = 50; // 一种天气持续的最短/最长秒数
const MAX_DURATION = 110;
const TRANSITION = 10; // 天气强度过渡秒数

const RAIN_SKY = new THREE.Color('#5f7280');
const RAIN_SUN = new THREE.Color('#8fa3b4');

/**
 * 天气系统:晴/雨随机轮换,强度平滑过渡。
 * 在昼夜系统之后执行,对天空色、灯光做一层调制;
 * 雨天提供口渴消耗系数(可接雨水)。
 */
export class WeatherSystem {
  readonly state: { type: WeatherType; label: string };
  private type: WeatherType = Math.random() < 0.5 ? 'sunny' : 'rain';
  private timer = this.pickDuration();
  /** 当前雨强度(过渡插值),输出给粒子 */
  private rainAmount = this.type === 'rain' ? 1 : 0;
  private label: string;

  constructor(
    private sun: THREE.DirectionalLight,
    private hemi: THREE.HemisphereLight,
    private scene: THREE.Scene
  ) {
    this.label = this.type === 'rain' ? '🌧️ 雨' : '☀️ 晴';
    this.state = { type: this.type, label: this.label };
  }

  update(delta: number): void {
    this.timer -= delta;
    if (this.timer <= 0) this.switchWeather();
    const k = delta / TRANSITION;
    this.rainAmount = THREE.MathUtils.lerp(
      this.rainAmount,
      this.type === 'rain' ? 1 : 0,
      k
    );

    // 雨天明显压暗并去饱和:天空偏深灰蓝,阳光变冷
    const sky = this.scene.background as THREE.Color;
    const a = this.rainAmount;
    sky.lerp(RAIN_SKY, a * 0.75);
    this.sun.color.lerp(RAIN_SUN, a * 0.7);
    this.sun.intensity *= 1 - 0.55 * a;
    this.hemi.intensity *= 1 - 0.45 * a;
  }

  /** 雨滴粒子强度 */
  get rainIntensity(): number {
    return this.rainAmount;
  }

  /** 口渴消耗乘数:雨天淋雨减缓口渴 */
  get thirstDrainMultiplier(): number {
    return 1 - 0.4 * this.rainAmount;
  }

  private switchWeather(): void {
    this.timer = this.pickDuration();
    this.type = this.type === 'rain' ? 'sunny' : 'rain';
    this.label = this.type === 'rain' ? '🌧️ 雨' : '☀️ 晴';
    this.state.type = this.type;
    this.state.label = this.label;
  }

  private pickDuration(): number {
    return MIN_DURATION + Math.random() * (MAX_DURATION - MIN_DURATION);
  }
}
