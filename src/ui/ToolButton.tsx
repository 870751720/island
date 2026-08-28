'use client';

import type { HandTool } from '@/game/entities/Player';

const TOOL_ICONS: Record<HandTool, string> = {
  hand: '✋',
  axe: '🪓',
  pickaxe: '⛏️',
  fishingrod: '🎣',
};

/** 右中侧工具切换按钮:循环 空手 → 斧子 → 镐子 → 鱼竿(仅已拥有的);pulse 时轻缩放提示可切换 */
export function ToolButton({
  tool,
  pulse,
  onCycle,
}: {
  tool: HandTool;
  pulse: boolean;
  onCycle: () => void;
}) {
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        onCycle();
      }}
      style={{
        position: 'absolute',
        right: 'max(16px, env(safe-area-inset-right))',
        top: '50%',
        transform: 'translateY(-50%)',
        width: 72,
        height: 72,
        borderRadius: '50%',
        border: 'none',
        background: 'rgba(90, 110, 140, 0.8)',
        fontSize: 30,
        touchAction: 'none',
        userSelect: 'none',
        boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
        animation: pulse ? 'tool-pulse 0.9s ease-in-out infinite' : 'none',
      }}
    >
      {TOOL_ICONS[tool]}
      <style>{`@keyframes tool-pulse { 0%, 100% { scale: 1 } 50% { scale: 1.12 } }`}</style>
    </button>
  );
}
