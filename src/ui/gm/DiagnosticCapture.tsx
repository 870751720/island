'use client';
import { useEffect, useState } from 'react';
import type { Game } from '@/game/Game';
import { gameTheme, gameButtonStyle } from '../gameTheme';
import { ActionButton } from './controls';

/** 采集与报告由 Game 持有，离开 GM 面板不打断采集。 */
export function DiagnosticCapture({ getGame }: { getGame: () => Game | null }) {
  const capture = getGame()?.frameDiagnostics;
  const [active, setActive] = useState(capture?.active ?? false);
  const [report, setReport] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    setActive(capture?.active ?? false);
    if (!capture?.active) return;
    const timer = window.setInterval(() => setActive(capture.active), 1000);
    return () => window.clearInterval(timer);
  }, [capture, active]);
  const hasReport = !active && (capture?.frames ?? 0) > 0;

  return <section aria-label="卡顿采集" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: 12, border: gameTheme.line, background: gameTheme.inset, color: gameTheme.ink, minWidth: 0 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <strong style={{ fontSize: 14 }}>卡顿采集</strong>
      <span role="status" style={{ fontSize: 12, color: active ? gameTheme.warning : gameTheme.muted }}>
        {active ? '采集中' : hasReport ? '报告已就绪' : '未开启'}
      </span>
    </div>
    <div style={{ fontSize: 12, lineHeight: 1.6, color: gameTheme.muted }}>
      {active ? '可以关闭 GM 继续游玩，出现卡顿后回来结束采集。最多采集两分钟，结束后在这里查看报告。' : '按需记录卡顿，默认关闭。报告仅留在本次游戏中，不会自动上传。重新采集会替换上次报告。'}
    </div>
    <ActionButton tone="primary" label={active ? '结束采集' : hasReport ? '重新采集' : '开始采集'} onClick={() => {
      const game = getGame();
      if (!game) return;
      const stopping = game.frameDiagnostics.active;
      game.capturePerformance(!stopping);
      setActive(game.frameDiagnostics.active);
      setReport('');
      setMessage(stopping && !game.frameDiagnostics.frames ? '尚未采到有效帧，请关闭 GM 后继续游玩再试。' : '');
    }} />
    {hasReport && <ActionButton label={report ? '收起报告' : '查看报告'} onClick={() => {
      setReport(report ? '' : capture!.report());
      setMessage('');
    }} />}
    {report && <>
      <textarea aria-label="可复制的卡顿报告" readOnly value={report} onFocus={e => e.currentTarget.select()} style={{ boxSizing: 'border-box', width: '100%', height: '25vh', minHeight: 120, padding: 10, border: gameTheme.line, borderRadius: 10, background: gameTheme.surface, color: gameTheme.ink, fontSize: 16, userSelect: 'text', WebkitUserSelect: 'text', touchAction: 'pan-y', resize: 'vertical' }} />
      <button style={{ ...gameButtonStyle, padding: '10px 12px', fontSize: 14, fontWeight: 600 }} onClick={async () => {
        try { await navigator.clipboard.writeText(report); setMessage('已复制，可以粘贴发送。'); }
        catch { setMessage('请点报告文本框全选，再长按复制。'); }
      }}>复制报告</button>
    </>}
    {message && <div role="status" style={{ fontSize: 12, lineHeight: 1.6, color: gameTheme.muted }}>{message}</div>}
  </section>;
}
