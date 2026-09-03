'use client';

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
        top: 'max(12vh, env(safe-area-inset-top))',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: '80vw',
        padding: '10px 18px',
        borderRadius: 12,
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        fontFamily: 'sans-serif',
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
