'use client';

import { useEffect, useState } from 'react';
import type { Game } from '@/game/Game';

/** 轮询本机性能诊断开关与报告文本 */
export function usePerformanceReport(getGame: () => Game | null) {
  const [state, setState] = useState({ enabled: false, report: '' });
  useEffect(() => {
    const refresh = () => {
      const monitor = getGame()?.performanceMonitor;
      setState({ enabled: monitor?.enabled ?? false, report: monitor?.report ?? '' });
    };
    refresh();
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, [getGame]);
  return state;
}

/** 性能诊断开启时悬浮在画面右上角的实时报告 */
export function PerformanceOverlay({ getGame }: { getGame: () => Game | null }) {
  const { enabled, report } = usePerformanceReport(getGame);
  if (!enabled || !report) return null;
  return <pre style={{ position: 'absolute', top: 65, right: 8, maxWidth: 'calc(100% - 16px)', margin: 0, padding: 8, borderRadius: 8, background: 'rgba(0,0,0,.7)', color: '#fff', fontSize: 10, whiteSpace: 'pre-wrap', pointerEvents: 'none', zIndex: 30 }}>{report}</pre>;
}
