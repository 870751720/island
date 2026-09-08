'use client';

import type { ResourceKind } from '@/game/systems/Inventory';
import { ITEMS } from '@/game/systems/Items';

/** 可放置道具选择面板:长按工具按钮弹出,平铺展示背包里所有可手持放置的道具(图标+数量),
 * 点选直接切入对应手持放置模式;点面板外任意处关闭 */
export function PlacePicker({
  items,
  onPick,
  onClose,
}: {
  items: { kind: ResourceKind; count: number }[];
  onPick: (kind: ResourceKind) => void;
  onClose: () => void;
}) {
  return (
    <div
      onPointerDown={(e) => {
        e.preventDefault();
        onClose();
      }}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        background: 'rgba(0,0,0,0.25)',
      }}
    >
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          right: 'max(16px, env(safe-area-inset-right))',
          top: '50%',
          transform: 'translateY(-70%)',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 60px)',
          gap: 8,
          padding: 10,
          borderRadius: 14,
          background: 'rgba(50, 56, 66, 0.95)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          maxHeight: '60vh',
          overflowY: 'auto',
        }}
      >
        {items.map(({ kind, count }) => (
          <button
            key={kind}
            onPointerDown={(e) => {
              e.preventDefault();
              onPick(kind);
            }}
            style={{
              position: 'relative',
              width: 60,
              height: 60,
              border: 'none',
              borderRadius: 10,
              background: 'rgba(90, 110, 140, 0.8)',
              fontSize: 26,
              lineHeight: '34px',
              touchAction: 'none',
              userSelect: 'none',
            }}
          >
            {ITEMS[kind].icon}
            <span
              style={{
                display: 'block',
                fontSize: 10,
                lineHeight: '14px',
                color: 'rgba(255,255,255,0.85)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {ITEMS[kind].name}
            </span>
            <span
              style={{
                position: 'absolute',
                right: 2,
                top: 2,
                minWidth: 18,
                padding: '0 4px',
                borderRadius: 9,
                background: 'rgba(40,40,40,0.75)',
                color: '#fff',
                fontSize: 11,
                lineHeight: '16px',
              }}
            >
              {count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
