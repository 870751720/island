'use client';
import { useEffect, useState, type RefObject } from 'react';
import type { Game } from '@/game/Game';

/** 临时真机排查入口；报告由玩家自行复制发送。 */
export function DiagnosticCapture({ gameRef }: { gameRef: RefObject<Game | null> }) {
  const [active, setActive] = useState(false);
  const [report, setReport] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      const capture = gameRef.current?.frameDiagnostics;
      if (capture && !capture.active) { setActive(false); setReport(capture.report()); }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active, gameRef]);
  const button = { minHeight: 44, padding: '8px 12px', borderRadius: 10, border: '1px solid #927c55', background: '#fff5dc', color: '#493c29', fontSize: 13 };
  const stop = () => {
    const game = gameRef.current;
    if (!game) return;
    game.capturePerformance(false);
    setActive(false); setReport(game.frameDiagnostics.report());
  };
  return <>
    <button style={{ ...button, position: 'absolute', right: 8, top: '38%', zIndex: 45 }} onClick={() => {
      if (active) { stop(); return; }
      if (!gameRef.current) return;
      setReport(''); setMessage(''); gameRef.current.capturePerformance(true); setActive(true);
    }}>{active ? '结束采集' : '卡顿采集'}</button>
    {active && <div style={{ position: 'absolute', top: 'calc(38% + 48px)', right: 8, maxWidth: 155, padding: 6, borderRadius: 8, background: '#fff5dce8', color: '#493c29', fontSize: 11, pointerEvents: 'none', zIndex: 45 }}>继续游玩，卡顿后点结束。两分钟自动结束。</div>}
    {report && <div role="dialog" aria-modal="true" aria-label="卡顿采集报告" style={{ position: 'absolute', inset: 0, zIndex: 200, background: '#0009', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div style={{ width: '100%', maxWidth: 440, maxHeight: '90%', overflow: 'auto', touchAction: 'pan-y', padding: 14, borderRadius: 16, background: '#fff5dc', color: '#493c29' }}>
        <strong>卡顿采集报告</strong>
        <p style={{ fontSize: 13 }}>复制报告发给我，并说明采集期间是否出现卡顿。报告仅保留在本页，不会自动上传。</p>
        <textarea aria-label="可复制的诊断报告" readOnly value={report} onFocus={e => e.currentTarget.select()} style={{ boxSizing: 'border-box', width: '100%', height: '30vh', fontSize: 16, userSelect: 'text', WebkitUserSelect: 'text', touchAction: 'pan-y' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button style={button} onClick={async () => {
            try { await navigator.clipboard.writeText(report); setMessage('已复制，可以粘贴发送。'); }
            catch { setMessage('请点报告文本框全选，再长按复制。'); }
          }}>复制报告</button>
          <button style={button} onClick={() => { setReport(''); setMessage(''); }}>关闭</button>
        </div>
        {message && <p role="status" style={{ fontSize: 13 }}>{message}</p>}
      </div>
    </div>}
  </>;
}
