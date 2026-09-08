import * as THREE from 'three';
import { GmSystem } from '../systems/GmSystem';

/**
 * 季节积雪表现:通过共享 shader uniform 驱动全场材质的雪色混合。
 * 朝上的表面(normal.y 大)积雪多,侧面向枯色过渡,地面整体覆白;
 * 不改任何模型与材质实例,移动端零额外 drawcall。
 */

/** 全材质共享的雪量 uniform(0=无雪,1=积雪饱和) */
const snowAmount = { value: 0 };

/** 雪色:略偏蓝的白,避免与纯白 UI 混淆 */
const SNOW_COLOR = 'vec3(0.93, 0.95, 0.98)';

/** 雪量过渡速度(每秒最多变化的量) */
const SNOW_FADE_SPEED = 0.08;

/**
 * 给材质注入积雪混合:在法线计算后按朝向把 diffuse 混向雪色。
 * 适用于 MeshStandardMaterial(flatShading 兼容)。
 */
export function patchSnowMaterial(mat: THREE.MeshStandardMaterial): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSnowAmount = snowAmount;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSnowAmount;')
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          float cover = uSnowAmount * smoothstep(0.05, 0.9, normal.y);
          diffuseColor.rgb = mix(diffuseColor.rgb, ${SNOW_COLOR}, cover);
        }`
      );
  };
  mat.customProgramCacheKey = () => 'season-snow';
}

/** 每帧驱动:雪量向 GM 目标值平滑过渡(需主机与客人各自本地执行) */
export function updateSeasonSnow(delta: number): void {
  const target = GmSystem.snowPreview ? 1 : 0;
  const step = SNOW_FADE_SPEED * Math.max(delta, 0);
  const diff = target - snowAmount.value;
  if (Math.abs(diff) <= step) snowAmount.value = target;
  else snowAmount.value += Math.sign(diff) * step;
}
