import * as THREE from 'three';

/** 手机竖屏基准宽高比(约 375×812):粒子密度以它为 1 倍基准 */
export const BASE_ASPECT = 0.46;
/** 密度缩放上限:覆盖 21:9 超宽屏,同时约束最大缓冲与逐帧运算量 */
export const MAX_SCALE = 5;

/**
 * 天气粒子密度缩放系数:正交相机半高恒定,可见世界面积随宽高比线性增长,
 * 竖屏及更窄的屏幕取 1(维持手机端现状),宽屏按比例加密。
 */
export function particleScale(aspect: number): number {
  return THREE.MathUtils.clamp(aspect / BASE_ASPECT, 1, MAX_SCALE);
}
