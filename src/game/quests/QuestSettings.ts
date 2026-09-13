const KEY = 'island.quest-guide';
let cached: boolean | undefined;
export function loadQuestGuide(): boolean {
  if (cached !== undefined) return cached;
  try { cached = localStorage.getItem(KEY) !== 'off'; } catch { cached = true; }
  return cached;
}
export function saveQuestGuide(enabled: boolean): void {
  cached = enabled;
  try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch { /* 游戏内偏好仍可生效。 */ }
}
