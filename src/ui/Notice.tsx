'use client';

import { gameTheme } from './gameTheme';

import { useEffect, useState } from 'react';

/** 通用临时提示:屏幕上方居中的短消息,出现后自动消失(按 id 重置计时) */
const NOTICE_MS = 2200;

export function Notice({ notice }: { notice: { id: number; text: string } | null }) {
  const [visibleId, setVisibleId] = useState<number | null>(null);

  useEffect(() => {
    if (!notice) return;
    setVisibleId(notice.id);
    const timer = setTimeout(() => setVisibleId(null), NOTICE_MS);
    return () => clearTimeout(timer);
    // 按提示 id 计时:客人端 HUD 快照每帧都是新对象,不能按对象身份做依赖
  }, [notice?.id]);

  if (!notice || visibleId !== notice.id) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: 'max(calc(12 * var(--game-vh)), var(--game-safe-top))',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 'calc(80 * var(--game-vw))',
        padding: '10px 18px',
        borderRadius: 12,
        background: gameTheme.panel, border: gameTheme.border, boxShadow: gameTheme.controlShadow,
        color: gameTheme.ink,
        fontFamily: gameTheme.font,
        fontSize: 14,
        textAlign: 'center',
        pointerEvents: 'none',
        zIndex: 70,
      }}
    >
      {notice.text}
    </div>
  );
}
