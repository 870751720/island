'use client';

import { useRef } from 'react';
import { startHoldTap } from './holdRepeat';

type Props = {
  step: 1 | -1;
  /** 应用到按钮上的样式(各面板尺寸/底色不同) */
  style?: React.CSSProperties;
  disabled?: boolean;
  /** 数量变化:收到 ±stepSize(点按恒为 step,长按连发时随按住时长增大) */
  onChange: (delta: number) => void;
};

/** 数量步进按钮:点按一次 ±1;长按连发,按住越久步进越大、间隔越短(快速调数量) */
export function StepButton({ step, style, disabled, onChange }: Props) {
  const hold = useRef<(() => void) | null>(null);

  const stop = () => {
    hold.current?.();
    hold.current = null;
  };

  return (
    <button
      style={{ touchAction: 'none', userSelect: 'none', ...style }}
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        if (disabled) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        onChange(step);
        hold.current = startHoldTap({ onTap: () => {}, onRepeat: (s) => onChange(step * s) });
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
    >
      {step < 0 ? '−' : '+'}
    </button>
  );
}
