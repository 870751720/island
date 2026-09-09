import * as THREE from 'three';
import { patchSnowMaterial } from './SeasonSnow';

/**
 * 全场通用的黏土材质:flatShading + 高粗糙度的低面数手工质感,
 * 并统一挂接季节积雪/枯叶 shader(移动端零额外 drawcall)。
 * wither=true 用于阔叶树冠、灌木等落叶植被,入冬整体转枯黄。
 */
export function clayMaterial(color: string, wither = false): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
  patchSnowMaterial(mat, wither);
  return mat;
}
