import * as THREE from 'three';
import { getSeason, type Season } from './SeasonSystem';

export type WeatherType = 'sunny' | 'wind' | 'rain' | 'snow';

/** 传给植被摇摆与风中飘叶的风状态 */
export type WindParams = {
  intensity: number;
  dirX: number;
  dirZ: number;
};

const MIN_DURATION = 50; // 一种天气持续的最短/最长秒数
const MAX_DURATION = 110;
const TRANSITION = 10; // 各天气强度统一过渡秒数
/** 各季节天气概率表:雨(夏 25%/春秋 10%/冬 0%)、雪(仅冬 30%)、风(春秋 25%/夏 10%/冬 0%),其余为晴 */
const CHANCES: Record<Season, { rain: number; snow: number; wind: number }> = {
  spring: { rain: 0.1, snow: 0, wind: 0.25 },
  summer: { rain: 0.25, snow: 0, wind: 0.1 },
  autumn: { rain: 0.1, snow: 0, wind: 0.25 },
  winter: { rain: 0, snow: 0.3, wind: 0 },
};

const RAIN_SKY = new THREE.Color('#5f7280');
const RAIN_SUN = new THREE.Color('#8fa3b4');
const SNOW_SKY = new THREE.Color('#8ea3b8');
const SNOW_SUN = new THREE.Color('#bcc9d6');

/**
 * 天气系统:晴/风/雨/雪按季节概率表随机轮换,强度统一平滑过渡。
 * 在昼夜系统之后执行,对天空色、灯光做一层调制;
 * 雨天提供口渴消耗系数(可接雨水)。
 * 刮风天视觉与晴天一致,输出阵风包络的强度与随机风向,
 * 供植被摇摆和飘叶表现使用。
 */
export class WeatherSystem {
  readonly state: { type: WeatherType; label: string };
  private type: WeatherType = this.rollType();
  private timer = this.pickDuration();
  /** 当前雨强度(过渡插值),输出给粒子 */
  private rainAmount = this.type === 'rain' ? 1 : 0;
  /** 当前雪强度(过渡插值),输出给雪花粒子 */
  private snowAmount = this.type === 'snow' ? 1 : 0;
  /** 当前风强度(过渡插值),输出给植被摇摆与飘叶 */
  private windAmount = this.type === 'wind' ? 1 : 0;
  private windPhase = 0;
  private windDir = Math.random() * Math.PI * 2;
  /** 客人端:天气与风由房主快照驱动,本地不再随机轮换 */
  private net = false;
  private netRain = this.type === 'rain' ? 1 : 0;
  private netSnow = this.type === 'snow' ? 1 : 0;
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
      this.snowAmount = THREE.MathUtils.lerp(this.snowAmount, this.netSnow, delta / 0.3);
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
    this.snowAmount = THREE.MathUtils.lerp(
      this.snowAmount,
      this.type === 'snow' ? 1 : 0,
      k
    );

    this.windAmount = THREE.MathUtils.lerp(
      this.windAmount,
      this.type === 'wind' ? 1 : 0,
      k
    );
    this.windPhase += delta;
    this.modulate();
  }

  /** 雨天压暗去饱和,雪天蒙上浅灰白:调制天空色与阳光 */
  private modulate(): void {
    const sky = this.scene.background as THREE.Color;
    const a = this.rainAmount;
    sky.lerp(RAIN_SKY, a * 0.75);
    this.sun.color.lerp(RAIN_SUN, a * 0.7);
    this.sun.intensity *= 1 - 0.55 * a;
    this.hemi.intensity *= 1 - 0.45 * a;
    const s = this.snowAmount;
    sky.lerp(SNOW_SKY, s * 0.65);
    this.sun.color.lerp(SNOW_SUN, s * 0.5);
    this.sun.intensity *= 1 - 0.4 * s;
    this.hemi.intensity *= 1 - 0.3 * s;
  }

  /** 雨滴粒子强度 */
  get rainIntensity(): number {
    return this.rainAmount;
  }

  /** 雪花粒子强度 */
  get snowIntensity(): number {
    return this.snowAmount;
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

  /** 口渴消耗乘数:雨天淋雨大幅减缓口渴(雨水恩泽 buff) */
  get thirstDrainMultiplier(): number {
    return 1 - 0.9 * this.rainAmount;
  }

  /** GM 强制切换天气:立即生效并重新计时轮换 */
  force(type: WeatherType): void {
    this.applyType(type);
    this.timer = this.pickDuration();
  }

  /** 客人端:采用房主权威的天气/风状态(强度 + 风向),本地只做表现插值 */
  netSync(rainAmount: number, snowAmount: number, windAmount: number, dirX: number, dirZ: number): void {
    this.net = true;
    this.netRain = rainAmount;
    this.netSnow = snowAmount;
    this.netWind = windAmount;
    this.windDir = Math.atan2(dirZ, dirX);
    const type: WeatherType = rainAmount >= 0.5 ? 'rain' : snowAmount >= 0.5 ? 'snow' : windAmount >= 0.5 ? 'wind' : 'sunny';
    this.applyType(type);
  }

  private switchWeather(): void {
    this.timer = this.pickDuration();
    this.applyType(this.rollType());
  }

  /** 按当前季节的概率表掷出下一轮天气 */
  private rollType(): WeatherType {
    const { rain, snow, wind } = CHANCES[getSeason()];
    const r = Math.random();
    return r < rain ? 'rain'
      : r < rain + snow ? 'snow'
      : r < rain + snow + wind ? 'wind'
      : 'sunny';
  }

  /** 切换天气类型;刮风天换一个随机风向 */
  private applyType(type: WeatherType): void {
    this.type = type;
    if (type === 'wind') this.windDir = Math.random() * Math.PI * 2;
    this.state.type = type;
    this.state.label = type === 'rain' ? '🌧️ 雨' : type === 'snow' ? '🌨️ 雪' : type === 'wind' ? '🌬️ 风' : '☀️ 晴';
  }

  private pickDuration(): number {
    return MIN_DURATION + Math.random() * (MAX_DURATION - MIN_DURATION);
  }
}
