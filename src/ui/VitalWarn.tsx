'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { CSSProperties } from 'react';

/** 三条生存数值(0-100),与 SurvivalState 同步 */
export type VitalLevels = { hunger: number; thirst: number; health: number };

export type VitalWarnHandle = {
  update: (vitals: VitalLevels | null, x: number, y: number) => void;
};

const LOW_THRESHOLD = 20;

const ROWS: { key: keyof VitalLevels; icon: string; color: string }[] = [
  { key: 'health', icon: '❤️', color: '#c0392b' },
  { key: 'hunger', icon: '🍗', color: '#b9631e' },
  { key: 'thirst', icon: '💧', color: '#2471a3' },
];

/**
 * 低数值提醒:饥饿/口渴/健康任一 ≤20% 时,在玩家头顶显示对应「图标 + 剩余量小条」。
 * 每帧由 Game 投影出屏幕坐标后直写 DOM,跟随角色移动,不触发 React 重渲染。
 */
export const VitalWarn = forwardRef<VitalWarnHandle>(function VitalWarn(_, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fillRefs = useRef<(HTMLDivElement | null)[]>([]);

  useImperativeHandle(ref, () => ({
    update(vitals, x, y) {
      const root = rootRef.current;
      if (!root) return;
      const anyLow = !!vitals && ROWS.some((r) => vitals[r.key] <= LOW_THRESHOLD);
      root.style.display = anyLow ? 'flex' : 'none';
      if (!anyLow || !vitals) return;
      root.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
      ROWS.forEach((r, i) => {
        const low = vitals[r.key] <= LOW_THRESHOLD;
        const row = rowRefs.current[i];
        const fill = fillRefs.current[i];
        if (!row || !fill) return;
        row.style.display = low ? 'flex' : 'none';
        if (low) fill.style.width = `${Math.max(0, vitals[r.key])}%`;
      });
    },
  }));

  return (
    <div ref={rootRef} className="vital-warn" style={{ position: 'absolute', left: 0, top: 0, display: 'none' }}>
      {ROWS.map((r, i) => (
        <div
          key={r.key}
          ref={(el) => {
            rowRefs.current[i] = el;
          }}
          style={rowStyle}
        >
          <span style={{ fontSize: 12, lineHeight: 1 }}>{r.icon}</span>
          <div style={trackStyle}>
            <div
              ref={(el) => {
                fillRefs.current[i] = el;
              }}
              style={{ ...fillStyle, background: r.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
});

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

const trackStyle: CSSProperties = {
  width: 44,
  height: 5,
  borderRadius: 3,
  background: 'rgba(0,0,0,0.4)',
  overflow: 'hidden',
};

const fillStyle: CSSProperties = {
  height: '100%',
  borderRadius: 3,
};
