'use client';

import { useEffect, useState } from 'react';
import { SaveSystem } from '@/game/systems/SaveSystem';

/** 开始方式:继续 = 恢复存档,新档 = 清掉旧存档从头开始 */
export type StartMode = 'continue' | 'new';
/** 联机角色:创建房间(房主)或加入房间(客人) */
export type MultiplayerRole = 'host' | 'guest';

export function StartScreen({
  onStart,
  onMultiplayer,
  notice,
}: {
  onStart: (mode: StartMode) => void;
  onMultiplayer: (role: MultiplayerRole) => void;
  notice?: string;
}) {
  const [hasSave] = useState(() => !!SaveSystem.load());
  // 预渲染 HTML 里的按钮在 React 水合完成前无法响应点击,水合前不渲染按钮只显示加载提示
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  return (
    <div className="start-screen">
      <style>{css}</style>
      <div className="start-screen-bg">
        <div className="start-sun" />
        <div className="start-cloud" style={{ top: '10%', animationDelay: '0s', animationDuration: '42s' }} />
        <div className="start-cloud" style={{ top: '22%', animationDelay: '-18s', animationDuration: '58s' }} />
        <div className="start-birds">🕊️</div>
        <div className="start-sea" />
        <div className="start-wave start-wave-back" />
        <div className="start-wave start-wave-front" />
        <div className="start-island">🏝️</div>
      </div>
      <div className="start-panel">
        <div className="start-panel-deco">🌴</div>
        <h1 className="start-title">去你的岛</h1>
        <p className="start-subtitle">漂流到无人的小岛,靠双手活下去</p>
        {notice && <p className="start-notice">{notice}</p>}
        {ready ? (
          <>
            {hasSave && (
              <button className="start-button" onClick={() => onStart('continue')}>
                继续游戏
              </button>
            )}
            <button
              className={hasSave ? 'new-game-button' : 'start-button'}
              onClick={() => onStart('new')}
            >
              {hasSave ? '开新档' : '开始游戏'}
            </button>
            <div className="start-mp">
              <button className="mp-button" onClick={() => onMultiplayer('host')}>
                🏠 创建房间
              </button>
              <button className="mp-button" onClick={() => onMultiplayer('guest')}>
                🤝 加入房间
              </button>
            </div>
          </>
        ) : (
          <p className="start-loading">加载中…</p>
        )}
        <p className="start-hint">🍎 采集 · 🎣 钓鱼 · 🔥 生存</p>
      </div>
    </div>
  );
}

const css = `
.start-screen {
  position: absolute;
  inset: 0;
  overflow: hidden;
  font-family: sans-serif;
}
.start-screen-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(#6fc3ee 0%, #9dd9f4 50%, #cfeefb 78%, #f3e2b8 100%);
}
.start-sun {
  position: absolute;
  top: 7%;
  right: 12%;
  width: clamp(70px, 22vw, 120px);
  height: clamp(70px, 22vw, 120px);
  border-radius: 50%;
  background: radial-gradient(circle, #fff6c8 30%, #ffd97a 70%, rgba(255,217,122,0) 100%);
  animation: sun-pulse 5s ease-in-out infinite;
}
@keyframes sun-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
.start-cloud {
  position: absolute;
  left: -30%;
  width: clamp(120px, 36vw, 220px);
  height: clamp(36px, 10vw, 60px);
  border-radius: 999px;
  background: rgba(255,255,255,0.9);
  box-shadow: clamp(20px,6vw,40px) clamp(6px,2vw,12px) 0 rgba(255,255,255,0.9),
    clamp(50px,14vw,90px) clamp(-4px,-1vw,-2px) 0 rgba(255,255,255,0.85);
  animation: cloud-drift linear infinite;
}
@keyframes cloud-drift {
  from { transform: translateX(0); }
  to { transform: translateX(160vw); }
}
.start-birds {
  position: absolute;
  top: 16%;
  left: 14%;
  font-size: clamp(18px, 5vw, 26px);
  opacity: 0.85;
  animation: birds-fly 26s linear infinite;
}
@keyframes birds-fly {
  0% { transform: translate(0, 0); }
  50% { transform: translate(30vw, 4vh); }
  100% { transform: translate(70vw, -2vh); opacity: 0; }
}
.start-sea {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 34%;
  background: linear-gradient(#57bbe8, #2a7fb8 70%, #1d6399);
}
.start-wave {
  position: absolute;
  left: -50%;
  width: 200%;
  height: clamp(18px, 5vw, 28px);
  border-radius: 999px;
  background: rgba(255,255,255,0.35);
}
.start-wave-back { bottom: 31%; animation: wave-roll 7s ease-in-out infinite; }
.start-wave-front { bottom: 25%; background: rgba(255,255,255,0.5); animation: wave-roll 5s ease-in-out infinite reverse; }
@keyframes wave-roll {
  0%, 100% { transform: translateX(-2%); }
  50% { transform: translateX(2%); }
}
.start-island {
  position: absolute;
  bottom: 20%;
  left: 50%;
  font-size: clamp(90px, 30vw, 170px);
  line-height: 1;
  animation: island-bob 4s ease-in-out infinite;
  filter: drop-shadow(0 clamp(8px,2vw,14px) clamp(8px,2vw,14px) rgba(0,0,0,0.25));
}
@keyframes island-bob {
  0%, 100% { transform: translateX(-50%) translateY(0) rotate(-2deg); }
  50% { transform: translateX(-50%) translateY(-3%) rotate(2deg); }
}
.start-panel {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(84vw, 360px);
  padding: clamp(20px, 5vw, 32px) clamp(20px, 5vw, 32px) clamp(24px, 5vw, 32px);
  text-align: center;
  background: linear-gradient(rgba(255,253,245,0.96), rgba(255,248,232,0.94));
  border: 2px solid rgba(255,255,255,0.85);
  border-radius: 26px;
  box-shadow: 0 16px 48px rgba(20,60,90,0.35), inset 0 1px 0 rgba(255,255,255,0.9);
  animation: panel-in 0.6s ease-out;
}
@keyframes panel-in {
  from { opacity: 0; transform: translate(-50%, -46%); }
  to { opacity: 1; transform: translate(-50%, -50%); }
}
.start-panel-deco {
  font-size: clamp(28px, 8vw, 38px);
  line-height: 1;
}
.start-title {
  margin: 6px 0 0;
  font-size: clamp(38px, 11vw, 56px);
  font-weight: 800;
  letter-spacing: 0.1em;
  background: linear-gradient(135deg, #2c5f2d 20%, #4d9e4f 60%, #2c5f2d);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 2px 0 rgba(255,255,255,0.8));
}
.start-subtitle {
  margin: 10px 0 0;
  font-size: clamp(13px, 3.8vw, 15px);
  color: #6b7a5e;
}
.start-notice { margin: 10px 0 0; color: #b34a3c; font-size: 13px; font-weight: 700; }
.start-loading {
  margin-top: clamp(20px, 5vw, 28px);
  color: #9aa58a;
  font-size: clamp(14px, 4vw, 16px);
  letter-spacing: 0.2em;
  animation: loading-blink 1.2s ease-in-out infinite;
}
@keyframes loading-blink { 50% { opacity: 0.4; } }
.start-button {
  margin-top: clamp(20px, 5vw, 28px);
  width: 100%;
  min-height: 56px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(#ffbe5c, #f59a1f);
  color: #fff;
  font-size: clamp(18px, 5vw, 22px);
  font-weight: 700;
  letter-spacing: 0.2em;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
  box-shadow: 0 6px 0 #c97c12, 0 10px 20px rgba(245,154,31,0.35);
  cursor: pointer;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}
.start-button:active {
  transform: translateY(4px);
  box-shadow: 0 2px 0 #c97c12;
}
.new-game-button {
  margin-top: 14px;
  width: 100%;
  min-height: 44px;
  border: 1.5px solid rgba(44,95,45,0.25);
  border-radius: 12px;
  background: rgba(44, 95, 45, 0.06);
  color: #2c5f2d;
  font-size: clamp(14px, 4vw, 16px);
  letter-spacing: 0.08em;
  cursor: pointer;
}
.start-mp {
  margin-top: 14px;
  display: flex;
  gap: 10px;
}
.mp-button {
  flex: 1;
  min-height: 42px;
  border: 1.5px solid rgba(44,95,45,0.25);
  border-radius: 12px;
  background: rgba(44, 95, 45, 0.06);
  color: #2c5f2d;
  font-size: clamp(13px, 3.6vw, 15px);
  letter-spacing: 0.06em;
  cursor: pointer;
}
.start-hint {
  margin: clamp(14px, 4vw, 20px) 0 0;
  font-size: clamp(11px, 3vw, 13px);
  color: #9aa58a;
  letter-spacing: 0.06em;
}
`;
