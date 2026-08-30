'use client';

import { useEffect, useState } from 'react';
import { SaveSystem } from '@/game/systems/SaveSystem';

/** 开始方式:继续 = 恢复存档,新档 = 清掉旧存档从头开始 */
export type StartMode = 'continue' | 'new';

export function StartScreen({ onStart }: { onStart: (mode: StartMode) => void }) {
  const [hasSave] = useState(() => !!SaveSystem.load());
  // 预渲染 HTML 里的按钮在 React 水合完成前无法响应点击,先禁用避免「点了没反应」
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  return (
    <div className="start-screen">
      <style>{css}</style>
      <div className="start-screen-bg">
        <div className="start-sun" />
        <div className="start-cloud" style={{ top: '14%', animationDelay: '0s', animationDuration: '38s' }} />
        <div className="start-cloud" style={{ top: '26%', animationDelay: '-14s', animationDuration: '52s' }} />
        <div className="start-sea" />
        <div className="start-island">🏝️</div>
      </div>
      <div className="start-panel">
        <h1 className="start-title">荒岛求生</h1>
        <p className="start-subtitle">漂流到无人的小岛,靠双手活下去</p>
        {hasSave && (
          <button
            className="start-button"
            disabled={!ready}
            onClick={() => onStart('continue')}
          >
            {ready ? '继续游戏' : '加载中…'}
          </button>
        )}
        <button
          className={hasSave ? 'new-game-button' : 'start-button'}
          disabled={!ready}
          onClick={() => onStart('new')}
        >
          {ready ? (hasSave ? '开新档' : '开始游戏') : '加载中…'}
        </button>
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
  background: linear-gradient(#7ec8f0 0%, #a8dcf5 55%, #d8f0fb 100%);
}
.start-sun {
  position: absolute;
  top: 8%;
  right: 14%;
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
.start-sea {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 32%;
  background: linear-gradient(#4db3e6, #2a7fb8);
}
.start-island {
  position: absolute;
  bottom: 22%;
  left: 50%;
  transform: translateX(-50%);
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
  padding: clamp(24px, 6vw, 40px) clamp(20px, 5vw, 32px);
  text-align: center;
  background: rgba(255,252,240,0.92);
  border-radius: 22px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.25);
}
.start-title {
  margin: 0;
  font-size: clamp(34px, 10vw, 52px);
  letter-spacing: 0.12em;
  color: #2c5f2d;
  text-shadow: 0 2px 0 rgba(255,255,255,0.8);
}
.start-subtitle {
  margin: 10px 0 0;
  font-size: clamp(13px, 3.8vw, 15px);
  color: #6b7a5e;
}
.start-button {
  margin-top: clamp(20px, 5vw, 30px);
  width: 100%;
  min-height: 56px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(#ffb84d, #f59a1f);
  color: #fff;
  font-size: clamp(18px, 5vw, 22px);
  font-weight: 700;
  letter-spacing: 0.2em;
  box-shadow: 0 6px 0 #c97c12;
  cursor: pointer;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}
.start-button:active {
  transform: translateY(4px);
  box-shadow: 0 2px 0 #c97c12;
}
.start-button:disabled {
  background: linear-gradient(#c9c2b4, #a89f8d);
  box-shadow: 0 6px 0 #8a8272;
  cursor: wait;
}
.new-game-button {
  margin-top: 14px;
  width: 100%;
  min-height: 44px;
  border: none;
  border-radius: 12px;
  background: rgba(44, 95, 45, 0.08);
  color: #2c5f2d;
  font-size: clamp(14px, 4vw, 16px);
  letter-spacing: 0.08em;
  cursor: pointer;
}
`;
