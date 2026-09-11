import * as THREE from 'three';
import { GmSystem } from '../systems/GmSystem';

/**
 * 季节积雪表现:通过共享 shader uniform 驱动全场材质的雪色混合。
 * 朝上的表面(normal.y 大)积雪多,侧面向枯色过渡,地面整体覆白;
 * 不改任何模型与材质实例,移动端零额外 drawcall。
 * 落叶树种/灌木的材质额外传入 wither,入冬时整体向枯黄褐过渡(松柏等常绿不参与)。
 */

/** 全材质共享的雪量 uniform(0=无雪,1=积雪饱和) */
const snowAmount = { value: 0 };

/** 雪色:略偏蓝的白,避免与纯白 UI 混淆 */
const SNOW_COLOR = 'vec3(0.93, 0.95, 0.98)';

/** 雪量过渡速度(每秒最多变化的量) */
const SNOW_FADE_SPEED = 0.08;

/** 枯叶色:偏灰的黄褐,落叶树冠入冬的目标色 */
const WITHER_COLOR = 'vec3(0.60, 0.52, 0.30)';

/**
 * 给材质注入积雪混合:在法线计算后按朝向把 diffuse 混向雪色。
 * wither=true 的材质(阔叶树冠、灌木)先随雪量整体混向枯叶色,再叠积雪。
 * 适用于 MeshStandardMaterial(flatShading 兼容)。
 */
export function patchSnowMaterial(mat: THREE.MeshStandardMaterial, wither = false): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSnowAmount = snowAmount;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSnowAmount;')
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          ${wither ? `diffuseColor.rgb = mix(diffuseColor.rgb, ${WITHER_COLOR}, uSnowAmount * 0.85);` : ''}
          float cover = uSnowAmount * smoothstep(-0.15, 0.6, normal.y);
          diffuseColor.rgb = mix(diffuseColor.rgb, ${SNOW_COLOR}, cover);
        }`
      );
  };
  mat.customProgramCacheKey = () => (wither ? 'season-snow-wither' : 'season-snow');
}

/** 当前雪量(0=无雪,1=积雪饱和),供水洼结冰等玩法判定读取 */
export function getSnowAmount(): number {
  return snowAmount.value;
}

/** 每帧驱动:雪量向 GM 目标季节平滑过渡,冬季积雪其余无雪(需主机与客人各自本地执行) */
export function updateSeasonSnow(delta: number): void {
  const target = GmSystem.season === 'winter' ? 1 : 0;
  const step = SNOW_FADE_SPEED * Math.max(delta, 0);
  const diff = target - snowAmount.value;
  if (Math.abs(diff) <= step) snowAmount.value = target;
  else snowAmount.value += Math.sign(diff) * step;
}
