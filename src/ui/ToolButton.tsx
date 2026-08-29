'use client';

import type { HandTool } from '@/game/entities/Player';

const TOOL_ICONS: Record<HandTool, string> = {
  hand: '✋',
  axe: '🪓',
  pickaxe: '⛏️',
  fishingrod: '🎣',
  bow: '🏹',
  seed: '🌱',
};

/** 右中侧工具切换按钮:循环 空手 → 斧子 → 镐子 → 鱼竿 → 弓(仅已拥有的);pulse 时轻缩放提示可切换;
 * 靠近工作台/火堆时切换为对应图标并持续缩放提示,点击打开制作/火堆面板;持弓时角标显示剩余箭数 */
export function ToolButton({
  tool,
  pulse,
  workbench,
  campfire = false,
  arrowCount = 0,
  onCycle,
  onWorkbench,
  onCampfire,
}: {
  tool: HandTool;
  pulse: boolean;
  /** 是否显示为工作台模式(靠近工作台) */
  workbench: boolean;
  /** 是否显示为火堆模式(靠近火堆) */
  campfire?: boolean;
  /** 背包剩余箭数(持弓时角标展示) */
  arrowCount?: number;
  onCycle: () => void;
  onWorkbench: () => void;
  onCampfire: () => void;
}) {
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        workbench ? onWorkbench() : campfire ? onCampfire() : onCycle();
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
        background: workbench
          ? 'rgba(202, 138, 62, 0.9)'
          : campfire
            ? 'rgba(214, 92, 44, 0.9)'
            : 'rgba(90, 110, 140, 0.8)',
        fontSize: 30,
        touchAction: 'none',
        userSelect: 'none',
        boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
        animation:
          pulse || workbench || campfire ? 'tool-pulse 0.9s ease-in-out infinite' : 'none',
      }}
    >
      {workbench ? '🛠️' : campfire ? '🔥' : TOOL_ICONS[tool]}
      {!workbench && !campfire && tool === 'bow' && (
        <span
          style={{
            position: 'absolute',
            right: 4,
            bottom: 4,
            minWidth: 20,
            padding: '0 4px',
            borderRadius: 10,
            background: 'rgba(40,40,40,0.75)',
            color: '#fff',
            fontSize: 12,
            lineHeight: '18px',
          }}
        >
          {arrowCount}
        </span>
      )}
      <style>{`@keyframes tool-pulse { 0%, 100% { scale: 1 } 50% { scale: 1.12 } }`}</style>
    </button>
  );
}
