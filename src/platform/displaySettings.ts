const KEY = 'island.display.landscape';
const listeners = new Set<() => void>();
let cached: boolean | undefined;

/** 本机全局偏好，不属于角色存档，死亡/新游戏不会清除。 */
export function getLandscapeMode(): boolean {
  if (typeof window === 'undefined') return false;
  if (cached === undefined) {
    try { cached = window.localStorage.getItem(KEY) === 'on'; }
    catch { cached = false; }
  }
  return cached;
}

export function setLandscapeMode(enabled: boolean): void {
  cached = enabled;
  try { window.localStorage.setItem(KEY, enabled ? 'on' : 'off'); }
  catch { /* 存储不可用时仍保留本次会话的选择。 */ }
  listeners.forEach(listener => listener());
}

export function subscribeDisplaySettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
