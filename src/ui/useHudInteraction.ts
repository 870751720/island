import { useCallback, useEffect, useRef, useState } from 'react';

const UI_IDLE_DELAY = 5000;

/** 只延缓调用方 UI 的闲置隐藏，不改变角色闲置状态或其他控件。 */
export function useHudInteraction(idleHidden: boolean, reading = false) {
  const [recent, setRecent] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interact = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    setRecent(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setRecent(false);
    }, UI_IDLE_DELAY);
  }, []);
  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);
  return { hidden: idleHidden && !recent && !reading, interact };
}
