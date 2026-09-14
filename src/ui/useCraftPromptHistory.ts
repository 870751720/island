import { useState } from 'react';

const EMPTY_HISTORY: ReadonlySet<string> = new Set();

/** 点击历史只在本次 GameplayUI 生命周期内保留，退出后清空；联机不应用。 */
export function useCraftPromptHistory(singlePlayer: boolean) {
  const [history, setHistory] = useState<ReadonlySet<string>>(() => new Set());
  const dismiss = (id: string) => {
    if (singlePlayer) setHistory(previous => new Set([...previous, id]));
  };
  return { dismissedRecipes: singlePlayer ? history : EMPTY_HISTORY, dismiss };
}
