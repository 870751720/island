'use client';

import { useEffect, useState } from 'react';
import { arrivalDiagnostics } from '@/game/core/ArrivalDiagnostics';

export function ArrivalDiagnosticPanel() {
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState('');
  const [report, setReport] = useState('');
  useEffect(() => {
    const start = performance.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((performance.now() - start) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const copy = async () => {
    const text = arrivalDiagnostics.report();
    setReport(text);
    setMessage('可长按下方文本全选复制，发给开发者排查。');
    try {
      await navigator.clipboard.writeText(text);
      setMessage('诊断日志已复制，请粘贴发给开发者。');
    } catch { /* 不安全上下文或权限受限时保留手动复制入口。 */ }
  };

  return <div className="arrival-diagnostics">
    <p role="status">{arrivalDiagnostics.failed ? '登岛遇到异常，请复制日志反馈。' : elapsed >= 15 ? `已等待 ${elapsed} 秒，可复制日志反馈。` : '进不去？可以复制日志反馈。'}</p>
    <button type="button" className="arrival-next" onClick={copy}>复制诊断日志</button>
    {message && <p role="status">{message}</p>}
    {report && <textarea aria-label="登岛诊断日志，可长按复制" readOnly value={report} onFocus={event => event.currentTarget.select()} />}
  </div>;
}
