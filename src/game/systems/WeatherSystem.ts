import * as THREE from 'three';

export type WeatherType = 'sunny' | 'rain' | 'fog';

const MIN_DURATION = 50; // 一种天气持续的最短/最长秒数
const MAX_DURATION = 110;
const TRANSITION = 10; // 天气强度过渡秒数

// 相机距玩家约 38,雾天把可见距离压到视野边缘附近
const FOG_FAR_SUNNY = 300;
const FOG_NEAR_SUNNY = 220;
const FOG_NEAR = 26;
const FOG_FAR = 58;

const RAIN_SKY = new THREE.Color('#7d8f9c');
const FOG_SKY = new THREE.Color('#c3ccd1');

const WEATHERS: { type: WeatherType; weight: number; label: string }[] = [
  { type: 'sunny', weight: 0.5, label: '☀️ 晴' },
  { type: 'rain', weight: 0.25, label: '🌧️ 雨' },
  { type: 'fog', weight: 0.25, label: '🌫️ 雾' },
];

/**
 * 天气系统:晴/雨/雾按权重随机轮换,强度平滑过渡。
 * 在昼夜系统之后执行,对天空色、灯光与雾做一层调制;
 * 雨天提供口渴消耗系数(可接雨水)。
 */
export class WeatherSystem {
  readonly state: { type: WeatherType; label: string };
  private type: WeatherType = 'sunny';
  private timer = this.pickDuration();
  /** 当前雨/雾强度(过渡插值),输出给粒子与雾 */
  private rainAmount = 0;
  private fogAmount = 0;
  private fog: THREE.Fog;

  constructor(
    private sun: THREE.DirectionalLight,
    private hemi: THREE.HemisphereLight,
    private scene: THREE.Scene
  ) {
    this.fog = new THREE.Fog('#ffffff', FOG_NEAR_SUNNY, FOG_FAR_SUNNY);
    this.scene.fog = this.fog;
    this.state = { type: this.type, label: WEATHERS[0].label };
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
    this.fogAmount = THREE.MathUtils.lerp(
      this.fogAmount,
      this.type === 'fog' ? 1 : 0,
      k
    );

    // 压暗并去饱和:雨天天空偏灰蓝,雾天偏白灰
    const sky = this.scene.background as THREE.Color;
    const dim = 1 - 0.45 * this.rainAmount - 0.15 * this.fogAmount;
    this.sun.intensity *= dim;
    this.hemi.intensity *= dim;
    const tint = new THREE.Color();
    if (this.rainAmount > this.fogAmount) {
      tint.lerpColors(sky, RAIN_SKY, this.rainAmount * 0.6);
    } else {
      tint.lerpColors(sky, FOG_SKY, this.fogAmount * 0.5);
    }
    sky.copy(tint);
    this.sun.color.lerp(new THREE.Color('#aab7c4'), this.rainAmount * 0.5);

    this.fog.color.copy(sky);
    this.fog.near = THREE.MathUtils.lerp(FOG_NEAR_SUNNY, FOG_NEAR, this.fogAmount);
    this.fog.far = THREE.MathUtils.lerp(FOG_FAR_SUNNY, FOG_FAR, this.fogAmount);
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
    let next: WeatherType;
    do {
      const r = Math.random();
      let acc = 0;
      next = 'sunny';
      for (const w of WEATHERS) {
        acc += w.weight;
        if (r < acc) {
          next = w.type;
          break;
        }
      }
    } while (next === this.type); // 避免连续同种天气
    this.type = next;
    this.state.type = next;
    this.state.label = WEATHERS.find((w) => w.type === next)!.label;
  }

  private pickDuration(): number {
    return MIN_DURATION + Math.random() * (MAX_DURATION - MIN_DURATION);
  }
}
