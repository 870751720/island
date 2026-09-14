import { validLandmarkChances } from './LandmarkDefinitions';

const KEY = 'island.landmarkChances.v1';
export const DEFAULT_LANDMARK_CHANCES = [35, 10, 1];
/** 独立的本机开局偏好，不写入世界存档，不改变旧档。 */
export function loadLandmarkChances(): number[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (validLandmarkChances(value)) return [...value];
  } catch { /* 无存储权限时使用默认概率 */ }
  return [...DEFAULT_LANDMARK_CHANCES];
}
export function saveLandmarkChances(value: number[]): void {
  if (!validLandmarkChances(value)) return;
  try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* 本次进程仍保留配置 */ }
}
