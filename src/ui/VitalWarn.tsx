'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { CSSProperties } from 'react';

/** 三条生存数值(0-100),与 SurvivalState 同步 */
export type VitalLevels = { hunger: number; thirst: number; health: number };

export type VitalWarnHandle = {
  update: (vitals: VitalLevels | null, x: number, y: number) => void;
};

const LOW_THRESHOLD = 20;
/** 放在角色右侧,避开头顶正中的交互进度环 */
const OFFSET_X = 32;
/** 略微下移,贴近角色身体 */
const OFFSET_Y = 30;

const ROWS: { key: keyof VitalLevels; icon: string }[] = [
  { key: 'health', icon: '❤️' },
  { key: 'hunger', icon: '🍗' },
  { key: 'thirst', icon: '💧' },
];

/**
 * 低数值提醒:饥饿/口渴/健康任一 ≤20% 时,在玩家头顶显示对应图标。
 * 每帧由 Game 投影出屏幕坐标后直写 DOM,跟随角色移动,不触发 React 重渲染。
 */
export const VitalWarn = forwardRef<VitalWarnHandle>(function VitalWarn(_, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  useImperativeHandle(ref, () => ({
    update(vitals, x, y) {
      const root = rootRef.current;
      if (!root) return;
      const anyLow = !!vitals && ROWS.some((r) => vitals[r.key] <= LOW_THRESHOLD);
      root.style.display = anyLow ? 'flex' : 'none';
      if (!anyLow || !vitals) return;
      root.style.transform = `translate(-50%, -100%) translate(${x + OFFSET_X}px, ${y + OFFSET_Y}px)`;
      ROWS.forEach((r, i) => {
        const row = rowRefs.current[i];
        if (row) row.style.display = vitals[r.key] <= LOW_THRESHOLD ? 'flex' : 'none';
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
          <span style={{ fontSize: 13, lineHeight: 1 }}>{r.icon}</span>
        </div>
      ))}
    </div>
  );
});

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
};
