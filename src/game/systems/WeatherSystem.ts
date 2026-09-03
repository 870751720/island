import * as THREE from 'three';
import { GmSystem } from './GmSystem';

export type WeatherType = 'sunny' | 'rain';

/** 传给植被摇摆与风中飘叶的风状态 */
export type WindParams = {
  intensity: number;
  dirX: number;
  dirZ: number;
};

const MIN_DURATION = 50; // 一种天气持续的最短/最长秒数
const MAX_DURATION = 110;
const TRANSITION = 10; // 天气强度过渡秒数
const RAIN_CHANCE = 1 / 20; // 每次天气轮换时切换为雨天的概率
const WIND_CHANCE = 1 / 10; // 每轮晴天起风的概率
const WIND_TRANSITION = 6; // 风起/风停过渡秒数

const RAIN_SKY = new THREE.Color('#5f7280');
const RAIN_SUN = new THREE.Color('#8fa3b4');

/**
 * 天气系统:晴/雨随机轮换(每次轮换仅小概率切到雨天),强度平滑过渡。
 * 在昼夜系统之后执行,对天空色、灯光做一层调制;
 * 雨天提供口渴消耗系数(可接雨水)。
 * 风是晴天下的附属状态:每轮晴天按概率起风,GM 可强制三态;
 * 输出阵风包络的强度与风向,供植被摇摆和飘叶表现使用。
 */
export class WeatherSystem {
  readonly state: { type: WeatherType; label: string };
  private type: WeatherType = Math.random() < RAIN_CHANCE ? 'rain' : 'sunny';
  private timer = this.pickDuration();
  /** 当前雨强度(过渡插值),输出给粒子 */
  private rainAmount = this.type === 'rain' ? 1 : 0;
  /** 本轮晴天是否起风(auto 模式的目标) */
  private windy = false;
  private windAmount = 0;
  private windPhase = 0;
  private windDir = Math.random() * Math.PI * 2;
  /** 客人端:天气与风由房主快照驱动,本地不再随机轮换 */
  private net = false;
  private netRain = this.type === 'rain' ? 1 : 0;
  private netWind = 0;

  constructor(
    private sun: THREE.DirectionalLight,
    private hemi: THREE.HemisphereLight,
    private scene: THREE.Scene
  ) {
    this.state = { type: this.type, label: '' };
    this.applyType(this.type);
  }

  update(delta: number): void {
    if (this.net) {
      // 客人端:向房主权威值短时常数插值,保证 100ms 快照间隔内平滑无跳变
      this.rainAmount = THREE.MathUtils.lerp(this.rainAmount, this.netRain, delta / 0.3);
      this.windAmount = THREE.MathUtils.lerp(this.windAmount, this.netWind, delta / 0.3);
      this.windPhase += delta;
      this.modulate();
      return;
    }
    this.timer -= delta;
    if (this.timer <= 0) this.switchWeather();
    const k = delta / TRANSITION;
    this.rainAmount = THREE.MathUtils.lerp(
      this.rainAmount,
      this.type === 'rain' ? 1 : 0,
      k
    );

    const gm = GmSystem.wind;
    this.windAmount = THREE.MathUtils.lerp(
      this.windAmount,
      gm === 'on' ? 1 : gm === 'off' ? 0 : this.windy ? 1 : 0,
      delta / WIND_TRANSITION
    );
    this.windPhase += delta;
    this.modulate();
  }

  /** 雨天压暗并去饱和:天空偏深灰蓝,阳光变冷 */
  private modulate(): void {
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

  /** 阵风包络后的风强度(0~1),供植被与飘叶消费 */
  get windIntensity(): number {
    const gust = Math.sin(this.windPhase * 0.9) * Math.sin(this.windPhase * 0.37 + 1.3);
    return this.windAmount * (0.6 + 0.4 * gust);
  }

  /** 当前风状态(强度 + 单位方向向量) */
  get wind(): WindParams {
    return {
      intensity: this.windIntensity,
      dirX: Math.cos(this.windDir),
      dirZ: Math.sin(this.windDir),
    };
  }

  /** 口渴消耗乘数:雨天淋雨减缓口渴 */
  get thirstDrainMultiplier(): number {
    return 1 - 0.4 * this.rainAmount;
  }

  /** GM 强制切换天气:立即生效并重新计时轮换 */
  force(type: WeatherType): void {
    this.applyType(type);
    this.timer = this.pickDuration();
  }

  /** 客人端:采用房主权威的天气/风状态(强度 + 风向),本地只做表现插值 */
  netSync(rainAmount: number, windAmount: number, dirX: number, dirZ: number): void {
    this.net = true;
    this.netRain = rainAmount;
    this.netWind = windAmount;
    this.windDir = Math.atan2(dirZ, dirX);
    const type: WeatherType = rainAmount >= 0.5 ? 'rain' : 'sunny';
    this.type = type;
    this.state.type = type;
    this.state.label = type === 'rain' ? '🌧️ 雨' : '☀️ 晴';
  }

  private switchWeather(): void {
    this.timer = this.pickDuration();
    this.applyType(Math.random() < RAIN_CHANCE ? 'rain' : 'sunny');
  }

  /** 切换天气类型并重掷本轮风:晴天按概率起风,起风时换一个随机风向 */
  private applyType(type: WeatherType): void {
    this.type = type;
    this.windy = type === 'sunny' && Math.random() < WIND_CHANCE;
    if (this.windy) this.windDir = Math.random() * Math.PI * 2;
    this.state.type = type;
    this.state.label = type === 'rain' ? '🌧️ 雨' : '☀️ 晴';
  }

  private pickDuration(): number {
    return MIN_DURATION + Math.random() * (MAX_DURATION - MIN_DURATION);
  }
}
