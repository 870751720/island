export type GameMode = 'leisure' | 'survival';

export const GAME_MODE_LABELS: Record<GameMode, string> = { leisure: '悠然', survival: '求生' };
const KEY = 'island-game-mode';

export function loadGameMode(): GameMode {
  try { return localStorage.getItem(KEY) === 'survival' ? 'survival' : 'leisure'; }
  catch { return 'leisure'; }
}

export function rememberGameMode(mode: GameMode): void {
  try { localStorage.setItem(KEY, mode); } catch { /* 存储不可用时保留本次选择。 */ }
}
