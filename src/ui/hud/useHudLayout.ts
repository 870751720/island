import { useState } from 'react';

const STORAGE_KEY = 'island-hud-top-offset';
export const MAX_HUD_TOP_OFFSET = 120;

function normalize(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(MAX_HUD_TOP_OFFSET, Math.round(value))) : 0;
}

function load(): number {
  try { return normalize(Number(localStorage.getItem(STORAGE_KEY))); }
  catch { return 0; }
}

/** 设备界面偏好独立于世界存档，不上传到联机房间或云存档。 */
export function useHudLayout() {
  const [topOffset, setValue] = useState(load);
  const setTopOffset = (value: number) => {
    const next = normalize(value);
    setValue(next);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* 禁用存储时仍在本次游戏生效。 */ }
  };
  return { topOffset, setTopOffset };
}
