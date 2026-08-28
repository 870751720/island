'use client';

import type { HandTool } from '@/game/entities/Player';

const TOOL_ICONS: Record<HandTool, string> = {
  hand: '✋',
  axe: '🪓',
  pickaxe: '⛏️',
  fishingrod: '🎣',
};

/** 右中侧工具切换按钮:循环 空手 → 斧子 → 镐子 → 鱼竿(仅已拥有的);pulse 时轻缩放提示可切换;
 * 靠近工作台时切换为工作台图标并持续缩放提示,点击打开制作面板 */
export function ToolButton({
  tool,
  pulse,
  workbench,
  onCycle,
  onWorkbench,
}: {
  tool: HandTool;
  pulse: boolean;
  /** 是否显示为工作台模式(靠近工作台) */
  workbench: boolean;
  onCycle: () => void;
  onWorkbench: () => void;
}) {
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        workbench ? onWorkbench() : onCycle();
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
        background: workbench ? 'rgba(202, 138, 62, 0.9)' : 'rgba(90, 110, 140, 0.8)',
        fontSize: 30,
        touchAction: 'none',
        userSelect: 'none',
        boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
        animation:
          pulse || workbench ? 'tool-pulse 0.9s ease-in-out infinite' : 'none',
      }}
    >
      {workbench ? '🛠️' : TOOL_ICONS[tool]}
      <style>{`@keyframes tool-pulse { 0%, 100% { scale: 1 } 50% { scale: 1.12 } }`}</style>
    </button>
  );
}
