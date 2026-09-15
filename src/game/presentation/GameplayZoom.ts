const KEY = 'island.gameplayZoom.v1';
let cached: number | undefined;

export function loadGameplayZoom(): number {
  if (cached !== undefined) return cached;
  try {
    const value = Number(localStorage.getItem(KEY));
    cached = Number.isFinite(value) ? Math.min(2, Math.max(1, value)) : 1;
  } catch {
    cached = 1;
  }
  return cached;
}

export function saveGameplayZoom(value: number): void {
  cached = value;
  try { localStorage.setItem(KEY, String(value)); } catch { /* 存储不可用时保留本次会话偏好。 */ }
}
