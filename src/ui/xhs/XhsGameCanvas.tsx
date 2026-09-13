'use client';

import { useState } from 'react';
import { useGameLifecycle } from '@/ui/useGameLifecycle';
import { VirtualJoystick } from '@/ui/VirtualJoystick';

const HUD_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(12px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))',
  left: 'calc(12px + var(--safe-area-inset-left, env(safe-area-inset-left, 0px)))',
  right: 'calc(12px + var(--safe-area-inset-right, env(safe-area-inset-right, 0px)))',
  zIndex: 3,
  display: 'flex',
  justifyContent: 'space-between',
  color: '#fff8e9',
  fontSize: 13,
  pointerEvents: 'none',
};

const BUTTON_STYLE: React.CSSProperties = {
  minWidth: 88,
  minHeight: 52,
  border: '1px solid rgba(255,248,233,0.7)',
  borderRadius: 14,
  background: 'rgba(19,60,69,0.9)',
  boxShadow: '0 4px 0 rgba(4,28,34,0.65)',
  color: '#fff8e9',
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: '0.06em',
  touchAction: 'manipulation',
};

/** 小红书离线渠道入口：只保留本地单机循环，禁止房间、联网与浏览器分享能力进入包体。 */
export function GameCanvas() {
  const [started, setStarted] = useState(false);
  const [runId, setRunId] = useState(0);

  if (!started) {
    return (
      <main style={{ minHeight: 'var(--app-height, 100vh)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'linear-gradient(145deg, #183f46, #245a5b 52%, #123b43)', color: '#fff8e9', fontFamily: 'Arial, "Microsoft YaHei", sans-serif', textAlign: 'center' }}>
        <section style={{ maxWidth: 360 }}>
          <p style={{ margin: '0 0 12px', color: '#ead8b4', fontSize: 12, letterSpacing: '0.18em' }}>OFFLINE ISLAND SURVIVAL</p>
          <h1 style={{ margin: '0 0 14px', fontSize: 46, letterSpacing: '0.08em' }}>去你的岛</h1>
          <p style={{ margin: '0 0 30px', color: '#e1e6d4', lineHeight: 1.8 }}>离线单机版。左侧按住屏幕移动，右下角按钮采集或使用当前工具。</p>
          <button style={{ ...BUTTON_STYLE, width: '100%', minHeight: 64, fontSize: 18 }} onClick={() => setStarted(true)}>开始荒岛求生</button>
        </section>
      </main>
    );
  }

  return <XhsRun key={runId} onRestart={() => setRunId((value) => value + 1)} />;
}

function XhsRun({ onRestart }: { onRestart: () => void }) {
  const { containerRef, gameRef, hud, worldReady } = useGameLifecycle({ initialSave: undefined });
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolOptions = [
    ['hand', '空手'], ['axe', '斧子'], ['pickaxe', '镐子'], ['shovel', '铲子'],
    ['hoe', '锄头'], ['fishingrod', '鱼竿'], ['bow', '弓'], ['sword', '剑'], ['lasso', '套索'],
  ] as const;

  return (
    <main style={{ position: 'relative', width: '100%', minHeight: 'var(--app-height, 100vh)', overflow: 'hidden', background: '#a8d8ea', fontFamily: 'Arial, "Microsoft YaHei", sans-serif' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {!worldReady && <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#a8d8ea', color: '#3f6f8f', fontSize: 17, letterSpacing: 3 }}>正在登上小岛…</div>}
      {!hud.dead && <VirtualJoystick onChange={(x, z) => gameRef.current?.setJoystick(x, z)} />}
      <div style={HUD_STYLE}>
        <div style={{ padding: '8px 10px', borderRadius: 12, background: 'rgba(10,48,55,0.72)', lineHeight: 1.65 }}>
          <div>第 {hud.day} 天 · {hud.season}</div>
          <div>生命 {Math.round(hud.health)} · 饥饿 {Math.round(hud.hunger)} · 口渴 {Math.round(hud.thirst)}</div>
        </div>
        <div style={{ padding: '8px 10px', borderRadius: 12, background: 'rgba(10,48,55,0.72)', lineHeight: 1.65, textAlign: 'right' }}>
          <div>当前：{hud.tool === 'hand' ? '空手' : hud.tool}</div>
          <div>{hud.notice?.text ?? '离线单机模式'}</div>
        </div>
      </div>
      {!hud.dead && (
        <div style={{ position: 'absolute', right: 'calc(16px + var(--safe-area-inset-right, env(safe-area-inset-right, 0px)))', bottom: 'calc(18px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))', zIndex: 4, textAlign: 'right' }}>
          {toolsOpen && <div style={{ width: 156, marginBottom: 12, padding: 8, borderRadius: 14, background: 'rgba(19,60,69,0.94)' }}>
            {toolOptions.map(([tool, label]) => <button key={tool} style={{ ...BUTTON_STYLE, width: '100%', minHeight: 42, margin: '4px 0', fontSize: 13 }} onClick={() => { gameRef.current?.selectTool(tool); setToolsOpen(false); }}>{label}</button>)}
          </div>}
          <button style={{ ...BUTTON_STYLE, display: 'block', marginLeft: 'auto', marginBottom: 12 }} onClick={() => setToolsOpen((open) => !open)}>切换工具</button>
          <button style={{ ...BUTTON_STYLE, minWidth: 108, minHeight: 62, fontSize: 16 }} disabled={hud.busy} onClick={() => gameRef.current?.useToolButton()}>{hud.busy ? '进行中…' : '采集 / 交互'}</button>
        </div>
      )}
      {hud.dead && <div style={{ position: 'absolute', inset: 0, zIndex: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(8,26,29,0.92)', color: '#fff8e9', textAlign: 'center' }}><section><h2 style={{ fontSize: 30 }}>你没能活下来…</h2><p style={{ color: '#d6ddce', lineHeight: 1.8 }}>本局进度已自动保存。重新进入岛屿继续探索。</p><button style={BUTTON_STYLE} onClick={onRestart}>重新进入</button></section></div>}
    </main>
  );
}
