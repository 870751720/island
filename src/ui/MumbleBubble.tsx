'use client';

import { useEffect, useState } from 'react';

const SHOW_SECONDS = 4;

export type MumbleBubbleState = { text: string; seq: number } | null;

/** 屏幕下方的角色自言自语气泡:显示数秒后自动淡出,不拦截任何触控 */
export function MumbleBubble({ mumble }: { mumble: MumbleBubbleState }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!mumble) return;
    setVisible(true);
    const hide = setTimeout(() => setVisible(false), SHOW_SECONDS * 1000);
    return () => clearTimeout(hide);
  }, [mumble?.seq]);

  if (!mumble) return null;

  return (
    <div
      key={mumble.seq}
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 'calc(112px + env(safe-area-inset-bottom))',
        transform: 'translateX(-50%)',
        maxWidth: '78vw',
        padding: '10px 18px',
        borderRadius: 16,
        background: 'rgba(255,255,255,0.94)',
        color: '#4a3b2a',
        fontFamily: 'sans-serif',
        fontSize: 15,
        lineHeight: 1.4,
        textAlign: 'center',
        pointerEvents: 'none',
        userSelect: 'none',
        boxShadow: '0 3px 12px rgba(0,0,0,0.25)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease',
        // 上下浮动,营造说话的氛围
        animation: 'mumble-float 3s ease-in-out infinite',
      }}
    >
      <style>{`@keyframes mumble-float { 0%,100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-4px); } }`}</style>
      💭 {mumble.text}
    </div>
  );
}
