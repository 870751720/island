import { useState } from 'react';

const STORAGE_KEY = 'island.craftPromptHistory';
const EMPTY_HISTORY: ReadonlySet<string> = new Set();

/** 单机制作提示的本机点击历史,独立于世界存档;联机不应用或写入。 */
export function useCraftPromptHistory(singlePlayer: boolean) {
  const [history, setHistory] = useState<ReadonlySet<string>>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      return new Set(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []);
    } catch {
      return new Set<string>();
    }
  });

  const dismiss = (id: string) => {
    if (!singlePlayer) return;
    const next = new Set(history);
    next.add(id);
    setHistory(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // 浏览器禁用本地存储时,仍保留本次游戏内的点击记录。
    }
  };

  return { dismissedRecipes: singlePlayer ? history : EMPTY_HISTORY, dismiss };
}
