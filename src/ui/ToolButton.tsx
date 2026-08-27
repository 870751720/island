'use client';

import type { HandTool } from '@/game/entities/Player';

const TOOL_ICONS: Record<HandTool, string> = {
  hand: '✋',
  axe: '🪓',
  pickaxe: '⛏️',
};

/** 右下角工具切换按钮:循环 空手 → 斧子 → 镐子(仅已拥有) */
export function ToolButton({ tool, onCycle }: { tool: HandTool; onCycle: () => void }) {
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        onCycle();
      }}
      style={{
        position: 'absolute',
        right: 20,
        bottom: 36,
        width: 72,
        height: 72,
        borderRadius: '50%',
        border: 'none',
        background: 'rgba(90, 110, 140, 0.8)',
        fontSize: 30,
        touchAction: 'none',
        userSelect: 'none',
        boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
      }}
    >
      {TOOL_ICONS[tool]}
    </button>
  );
}
