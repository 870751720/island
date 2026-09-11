import * as THREE from 'three';
import { patchSeasonMaterial, type SeasonKind } from './SeasonVisuals';

/**
 * 全场通用的黏土材质:flatShading + 高粗糙度的低面数手工质感,
 * 并统一挂接季节 shader(移动端零额外 drawcall)。
 * foliage=true 用于阔叶树冠、灌木等落叶植被,吃满夏干/秋色/冬季枯黄。
 */
export function clayMaterial(color: string, foliage = false): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
  patchSeasonMaterial(mat, foliage ? 'foliage' : 'plain');
  return mat;
}
