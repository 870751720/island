import { gameTheme } from './gameTheme';

/** 数量固定在右上角，为格子底部的名称留出空间。 */
export function SlotItemCount({ count }: { count: number }) {
  return <span style={{
    position: 'absolute', right: 3, top: 2,
    maxWidth: 'calc(100% - 6px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    fontSize: 10, lineHeight: '12px', fontWeight: 700,
    background: gameTheme.surface, borderRadius: 3, padding: '0 1px',
    color: gameTheme.ink, fontFamily: gameTheme.font, pointerEvents: 'none',
  }}>×{count}</span>;
}
