'use client';

import { gameTheme, gameButtonStyle } from '../gameTheme';

import { useEffect, useRef, useState } from 'react';
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
  label: ReactNode;
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

/** 游戏风格下拉选择:触发行内嵌展开选项列表,点选或点外部收起 */
export function SelectRow<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div ref={rootRef} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen(!open)}
        style={{ ...rowStyle, fontWeight: 600 }}
      >
        <span>{selected?.label ?? ariaLabel}</span>
        <span style={{ fontSize: 13, color: gameTheme.muted }}>{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div role="listbox" aria-label={ariaLabel} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {options.map((o) => (
            <button
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              style={{
                ...optionStyle,
                background: o.value === value ? gameTheme.selected : gameTheme.inset,
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
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

const optionStyle = {
  minHeight: 44,
  padding: '10px 14px',
  ...gameButtonStyle,
  borderRadius: 10,
  color: gameTheme.ink,
  fontFamily: gameTheme.font,
  fontSize: 14,
  fontWeight: 600,
  textAlign: 'left',
  cursor: 'pointer',
} as const;
