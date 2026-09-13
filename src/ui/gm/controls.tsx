'use client';

import { gameTheme, gameButtonStyle } from '../gameTheme';

import type { ReactNode } from 'react';

/** 通栏开关行:整行可点,右侧胶囊显示开启/关闭 */
export function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={rowStyle}
    >
      <span>{label}</span>
      <span
        style={{
          minWidth: 46,
          padding: '4px 10px',
          borderRadius: 999,
          background: value ? gameTheme.selected : gameTheme.inset,
          color: gameTheme.ink,
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {value ? '开启' : '关闭'}
      </span>
    </button>
  );
}

/** 通栏动作按钮:鼠尾草选中底为主操作,浅色凹面为普通操作 */
export function ActionButton({
  label,
  onClick,
  tone = 'normal',
}: {
  label: string;
  onClick: () => void;
  tone?: 'primary' | 'normal';
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...rowStyle,
        background: tone === 'primary' ? gameTheme.selected : gameTheme.inset,
        color: gameTheme.ink,
        fontWeight: 600,
        justifyContent: 'center',
      }}
    >
      {label}
    </button>
  );
}

/** 数值步进行:左标签、右 − 值 + */
export function StepperRow({
  label,
  value,
  step = 5,
  min = 0,
  onChange,
}: {
  label: ReactNode;
  value: number;
  step?: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ ...rowStyle, cursor: 'default' }}>
      <span>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => onChange(Math.max(min, value - step))} style={stepButtonStyle}>
          −
        </button>
        <span style={{ minWidth: 34, textAlign: 'center', fontWeight: 600 }}>{value}</span>
        <button onClick={() => onChange(value + step)} style={stepButtonStyle}>
          +
        </button>
      </span>
    </div>
  );
}

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  width: '100%',
  minHeight: 48,
  padding: '10px 14px',
  ...gameButtonStyle,
  borderRadius: 10,
  background: gameTheme.inset,
  fontFamily: gameTheme.font,
  fontSize: 15,
  color: gameTheme.ink,
  cursor: 'pointer',
} as const;

const stepButtonStyle = {
  width: 36,
  height: 36,
  ...gameButtonStyle,
  borderRadius: 8,
  background: gameTheme.action,
  color: gameTheme.ink,
  fontSize: 18,
  fontWeight: 700,
  cursor: 'pointer',
} as const;
