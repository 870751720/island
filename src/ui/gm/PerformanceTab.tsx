'use client';

import { useEffect, useState } from 'react';
import type { Game } from '@/game/Game';
import { ActionButton, ToggleRow } from './controls';

type Props = { getGame: () => Game | null };

function useReport(getGame: Props['getGame']) {
  const [state, setState] = useState({ enabled: false, report: '等待采样…' });
  useEffect(() => {
    const refresh = () => {
      const monitor = getGame()?.performanceMonitor;
      setState({ enabled: monitor?.enabled ?? false, report: monitor?.report ?? '游戏未就绪' });
    };
    refresh();
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, [getGame]);
  return state;
}

export function PerformanceTab({ getGame }: Props) {
  const { enabled, report } = useReport(getGame);
  const [message, setMessage] = useState('');
  return <div style={{ display: 'grid', gap: 10, color: '#4a3b2a' }}>
    <ToggleRow label="本机性能诊断" value={enabled} onChange={(v) => getGame()?.gmPerformance(v)} />
    <p style={{ margin: 0, fontSize: 13 }}>开启后关闭面板，在卡顿地点停留几秒。逻辑高表示游戏更新较慢；绘制次数和渲染提交高提示绘制压力。CPU 耗时较低仍掉帧，也可能是 GPU 或设备限频。</p>
    <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0 }}>{report}</pre>
    <ActionButton label="复制性能报告" onClick={() => {
      void navigator.clipboard?.writeText(report).then(() => setMessage('已复制'), () => setMessage('复制失败，请长按下方报告选择复制'));
      if (!navigator.clipboard) setMessage('请长按下方报告选择复制');
    }} />
    {message && <small>{message}</small>}
    <textarea aria-label="可复制性能报告" readOnly value={report} rows={8} style={{ width: '100%', boxSizing: 'border-box', fontSize: 12 }} />
  </div>;
}

export function PerformanceOverlay({ getGame }: Props) {
  const { enabled, report } = useReport(getGame);
  if (!enabled) return null;
  return <pre style={{ position: 'absolute', top: 65, right: 8, maxWidth: 'calc(100% - 16px)', margin: 0, padding: 8, borderRadius: 8, background: 'rgba(0,0,0,.7)', color: '#fff', fontSize: 10, whiteSpace: 'pre-wrap', pointerEvents: 'none', zIndex: 30 }}>{report}</pre>;
}
