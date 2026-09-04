'use client';

import type { ResourceKind } from '@/game/systems/Inventory';
import { ITEMS } from '@/game/systems/Items';
import { bedItemLevel } from '@/game/systems/BedSystem';
import { workbenchItemLevel } from '@/game/systems/WorkbenchSystem';
import { CUSTOM_ICONS } from './icons/CustomIcons';

/**
 * 道具图标的统一渲染入口:
 * - 有自绘 SVG 的道具(自绘图标表)优先画 SVG,其余用 ITEMS 的 emoji;
 * - 多级道具(床、工作台)在右上角标出级别;level 参数可覆盖(如精致工具 2 级)。
 */
export function ItemIcon({
  kind,
  level,
  size = 24,
}: {
  kind: ResourceKind;
  /** 覆盖级别角标(不传则按床/工作台的道具等级推导) */
  level?: number;
  size?: number;
}) {
  const Custom = CUSTOM_ICONS[kind];
  const badgeLevel = level ?? workbenchItemLevel(kind) ?? bedItemLevel(kind);
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
        lineHeight: 1,
      }}
    >
      {Custom ? (
        <Custom size={size} />
      ) : (
        <span style={{ fontSize: Math.round(size * 0.92) }}>{ITEMS[kind].icon}</span>
      )}
      {badgeLevel != null && (
        <span
          style={{
            position: 'absolute',
            top: -size * 0.1,
            right: -size * 0.18,
            minWidth: size * 0.42,
            height: size * 0.42,
            padding: `0 ${size * 0.07}px`,
            borderRadius: size * 0.21,
            background: '#4caf50',
            border: '1.5px solid #fff',
            color: '#fff',
            fontSize: size * 0.32,
            fontWeight: 700,
            fontFamily: 'sans-serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          {badgeLevel}
        </span>
      )}
    </span>
  );
}
