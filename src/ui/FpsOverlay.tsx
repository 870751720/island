'use client';

import { useEffect, useState } from 'react';
import { GmSystem } from '@/game/systems/GmSystem';

/**
 * 帧率浮层:GM 面板开启后显示在屏幕顶部。
 * 自己跑一个 rAF 循环与渲染共用帧队列,每 0.5s 汇报一次平均帧率,不侵入游戏代码。
 */
export function FpsOverlay() {
  const [fps, setFps] = useState(0);
  const [on, setOn] = useState(GmSystem.showFps);

  useEffect(() => {
    let frames = 0;
    let t0 = performance.now();
    let raf = 0;
    const loop = () => {
      frames++;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const timer = setInterval(() => {
      const now = performance.now();
      const value = frames > 0 ? (frames * 1000) / (now - t0) : 0;
      frames = 0;
      t0 = now;
      setFps(Math.round(value));
      setOn(GmSystem.showFps);
    }, 500);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
    };
  }, []);

  if (!on) return null;
  const color = fps >= 50 ? '#7ee29a' : fps >= 30 ? '#f2d06b' : '#ef8a8a';
  return (
    <div style={{ ...overlayStyle, color }}>
      {fps} FPS
    </div>
  );
}

const overlayStyle = {
  position: 'absolute',
  top: 8,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 30,
  padding: '3px 12px',
  borderRadius: 999,
  background: 'rgba(0,0,0,0.55)',
  fontFamily: 'monospace',
  fontSize: 13,
  fontWeight: 700,
  pointerEvents: 'none',
} as const;
