import * as THREE from 'three';
import { GmSystem } from '../systems/GmSystem';
import { getSeason } from '../systems/SeasonSystem';
import { seasonalPaletteShader } from './SeasonPalette';

/**
 * 季节视觉表现:通过共享 shader uniform 驱动全场材质随季节变色。
 * 三个连续系数:盛夏(uDry,植被浓绿)、秋色(uAutumn,植被金黄橙红)、积雪(uSnow)。
 * shader 内按 原色→夏绿→秋色→积雪 的固定顺序混合。
 * 不改任何模型与材质实例,移动端零额外 drawcall。
 */

/** 全材质共享的季节系数(0=无,1=饱和) */
const dryAmount = { value: 0 };
const autumnAmount = { value: 0 };
const snowAmount = { value: 0 };

/** 雪色:略偏蓝的白,避免与纯白 UI 混淆 */
const SNOW_COLOR = 'vec3(0.93, 0.95, 0.98)';
/** 枯叶色:偏灰的黄褐,落叶树冠入冬的目标色 */
const WITHER_COLOR = 'vec3(0.60, 0.52, 0.30)';

/** 季节系数过渡速度(每秒最多变化的量),与天气过渡量级一致 */
const SEASON_FADE_SPEED = 0.08;

/** 材质季节类别:foliage=落叶植被(吃满三季),terrain=地表(轻微吃夏秋),plain=其余(只吃积雪) */
export type SeasonKind = 'plain' | 'foliage' | 'terrain';

/**
 * 给材质注入季节变色(flatShading 兼容):
 * 夏绿/秋色按原色分层混色(仅绿色植被与草地),积雪按表面朝向(
 * normal.y)只覆朝上的面。foliage 在入冬时先整体转枯黄再叠雪。
 */
export function patchSeasonMaterial(mat: THREE.MeshStandardMaterial, kind: SeasonKind = 'plain'): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDry = dryAmount;
    shader.uniforms.uAutumn = autumnAmount;
    shader.uniforms.uSnowAmount = snowAmount;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uDry;\nuniform float uAutumn;\nuniform float uSnowAmount;'
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          ${seasonalPaletteShader(kind)}
          ${kind === 'foliage' ? `diffuseColor.rgb = mix(diffuseColor.rgb, ${WITHER_COLOR}, uSnowAmount * 0.85);` : ''}
          float cover = uSnowAmount * smoothstep(-0.15, 0.6, normal.y);
          diffuseColor.rgb = mix(diffuseColor.rgb, ${SNOW_COLOR}, cover);
        }`
      );
  };
  mat.customProgramCacheKey = () => `season-${kind}`;
}

/** 当前积雪量(0=无雪,1=饱和),供水洼结冰等玩法判定读取 */
export function getSnowAmount(): number {
  return snowAmount.value;
}

/** 当前夏干/秋色系数,供光照等非材质系统随季节连续调制 */
export function getSeasonTint(): { dry: number; autumn: number } {
  return { dry: dryAmount.value, autumn: autumnAmount.value };
}

/** 每帧驱动:各系数向目标季节(GM 覆盖或真实季节)平滑过渡(需主机与客人各自本地执行) */
export function updateSeasonVisuals(delta: number): void {
  const targets = SEASON_TARGETS[GmSystem.season === 'auto' ? getSeason() : GmSystem.season];
  const step = SEASON_FADE_SPEED * Math.max(delta, 0);
  for (const [current, target] of [
    [dryAmount, targets.dry],
    [autumnAmount, targets.autumn],
    [snowAmount, targets.snow],
  ] as const) {
    const diff = target - current.value;
    if (Math.abs(diff) <= step) current.value = target;
    else current.value += Math.sign(diff) * step;
  }
}

/** 各季节的系数目标:春全零,夏干,秋色,冬雪 */
const SEASON_TARGETS: Record<string, { dry: number; autumn: number; snow: number }> = {
  spring: { dry: 0, autumn: 0, snow: 0 },
  summer: { dry: 1, autumn: 0, snow: 0 },
  autumn: { dry: 0, autumn: 1, snow: 0 },
  winter: { dry: 0, autumn: 0, snow: 1 },
};
