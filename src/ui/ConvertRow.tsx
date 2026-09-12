'use client';

import { ItemIcon } from './ItemIcon';
import { StepButton } from './StepButton';
import { ITEMS } from '@/game/systems/Items';
import type { CSSProperties, ReactNode } from 'react';
import type { ResourceKind } from '@/game/systems/Inventory';

/**
 * 转换设施的通用面板样式与「数量选择行」:
 * 与烹饪台煮汤区同款布局(道具 → 产物 + 步进选数量 + 动作按钮),
 * 冶炼炉/纺织机/饵料桶/酿酒桶共用。
 */
export const convertOverlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.35)',
  touchAction: 'none',
  zIndex: 30,
};

export const convertPanelStyle: CSSProperties = {
  width: 'min(320px, calc(100vw - 48px))',
  maxHeight: '80dvh',
  overflowY: 'auto',
  padding: '18px 20px',
  borderRadius: 18,
  background: 'rgba(255,251,242,0.96)',
  color: '#333',
  fontFamily: 'sans-serif',
  boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
};

export const convertRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 10px',
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.08)',
  background: '#fff',
  // 允许竖向滚动穿透,行内按钮自身仍禁用默认手势
  touchAction: 'pan-y',
  userSelect: 'none',
};

export const convertStepButtonStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(0,0,0,0.08)',
  fontSize: 20,
  lineHeight: 1,
  touchAction: 'none',
  userSelect: 'none',
};

export const convertActionButtonStyle = (color: string): CSSProperties => ({
  padding: '8px 14px',
  borderRadius: 10,
  border: 'none',
  background: color,
  color: '#fff',
  fontWeight: 700,
  fontSize: 14,
  touchAction: 'none',
  userSelect: 'none',
});

export const convertCollectButtonStyle: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 10,
  border: 'none',
  background: '#4caf50',
  color: '#fff',
  fontWeight: 700,
  fontSize: 13,
  whiteSpace: 'nowrap',
  touchAction: 'none',
  userSelect: 'none',
};

export const convertTakeButtonStyle: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 10,
  border: 'none',
  background: '#8d9aa5',
  color: '#fff',
  fontWeight: 700,
  fontSize: 13,
  whiteSpace: 'nowrap',
  touchAction: 'none',
  userSelect: 'none',
};

export const convertBarStyle: CSSProperties = {
  height: 8,
  marginTop: 6,
  borderRadius: 4,
  background: 'rgba(0,0,0,0.08)',
  overflow: 'hidden',
};

/** 配方列表容器:露出约 3 又 1/4 行(末尾露一截提示可滚动),超出区域内滚动 */
export const convertListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  maxHeight: 192,
  overflowY: 'auto',
  // 允许手指在行上竖向滑动滚动列表
  touchAction: 'pan-y',
};

/** 道具行:左侧道具与产出提示,右侧步进选数量 + 动作按钮(布局对齐烹饪台煮汤区) */
export function ConvertRow({
  kind,
  /** 产物道具(显示「→ 产物」提示),不传则只显示道具本身 */
  to,
  /** 自定义提示行(优先于 to 的默认「→ 产物」文案) */
  hint,
  max,
  value,
  onDelta,
  actionLabel,
  actionColor,
  onAction,
  disabled = false,
}: {
  kind: ResourceKind;
  to?: ResourceKind;
  hint?: ReactNode;
  max: number;
  value: number;
  /** 数量变化:收到 ±步进(长按连发时随按住时长增大),父级用函数式 setState 应用 */
  onDelta: (delta: number) => void;
  actionLabel: string;
  actionColor: string;
  onAction: () => void;
  disabled?: boolean;
}) {
  return (
    <div style={convertRowStyle}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14 }}>
          <ItemIcon kind={kind} size={18} /> {ITEMS[kind].name} ×{max}
        </div>
        {hint ? (
          <div style={{ fontSize: 11, color: actionColor }}>{hint}</div>
        ) : (
          to && (
            <div style={{ fontSize: 11, color: actionColor }}>
              → <ItemIcon kind={to} size={18} /> {ITEMS[to].name}
            </div>
          )
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <StepButton
          step={-1}
          style={convertStepButtonStyle}
          disabled={value <= 1}
          onChange={(s) => onDelta(s)}
        />
        <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 700 }}>{value}</span>
        <StepButton
          step={1}
          style={convertStepButtonStyle}
          disabled={value >= max}
          onChange={(s) => onDelta(s)}
        />
      </div>
      <button
        disabled={disabled}
        onPointerDown={(e) => {
          e.preventDefault();
          onAction();
        }}
        style={{ ...convertActionButtonStyle(actionColor), opacity: disabled ? 0.45 : 1 }}
      >
        {actionLabel}
      </button>
    </div>
  );
}
