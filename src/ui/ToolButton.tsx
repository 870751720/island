'use client';

import type { HandTool } from '@/game/entities/Player';
import { fadeStyle } from './fade';

const TOOL_ICONS: Record<HandTool, string> = {
  hand: '✋',
  axe: '🪓',
  pickaxe: '⛏️',
  hoe: '⚒️',
  fishingrod: '🎣',
  bow: '🏹',
  sword: '🗡️',
  fence: '🚧',
  fenceGate: '🪵',
};

/** 右中侧工具切换按钮:循环 空手 → 斧子 → 镐子 → 鱼竿 → 弓(仅已拥有的);pulse 时轻缩放提示可切换;
 * 靠近工作台/火堆时切换为对应图标并持续缩放提示,点击打开制作/火堆面板;持弓/持鱼竿时角标显示剩余箭数/鱼饵数 */
export function ToolButton({
  tool,
  pulse,
  workbench,
  campfire = false,
  crate = false,
  baitBarrel = false,
  smelter = false,
  bed = false,
  arrowCount = 0,
  baitCount = 0,
  fenceCount = 0,
  dimmed = false,
  onCycle,
  onWorkbench,
  onCampfire,
  onCrate,
  onBaitBarrel,
  onSmelter,
  onBed,
}: {
  tool: HandTool;
  pulse: boolean;
  /** 是否显示为工作台模式(靠近工作台) */
  workbench: boolean;
  /** 是否显示为火堆模式(靠近火堆) */
  campfire?: boolean;
  /** 是否显示为木箱模式(靠近木箱) */
  crate?: boolean;
  /** 是否显示为饵料桶模式(靠近饵料桶) */
  baitBarrel?: boolean;
  /** 是否显示为冶炼炉模式(靠近冶炼炉) */
  smelter?: boolean;
  /** 是否显示为床模式(靠近床,点击开始睡觉) */
  bed?: boolean;
  /** 背包剩余箭数(持弓时角标展示) */
  arrowCount?: number;
  /** 背包剩余鱼饵数(持鱼竿时角标展示) */
  baitCount?: number;
  /** 手持围栏/门时背包剩余个数(角标展示) */
  fenceCount?: number;
  /** 玩家移动/交互中:按钮淡出且不可点 */
  dimmed?: boolean;
  onCycle: () => void;
  onWorkbench: () => void;
  onCampfire: () => void;
  onCrate: () => void;
  onBaitBarrel: () => void;
  onSmelter: () => void;
  onBed: () => void;
}) {
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        workbench
          ? onWorkbench()
          : campfire
            ? onCampfire()
            : crate
              ? onCrate()
              : baitBarrel
                ? onBaitBarrel()
                : smelter
                  ? onSmelter()
                  : bed
                  ? onBed()
                  : onCycle();
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
            : crate
              ? 'rgba(154, 118, 62, 0.9)'
              : baitBarrel
                ? 'rgba(151, 124, 74, 0.9)'
                : smelter
                  ? 'rgba(125, 130, 136, 0.9)'
                  : bed
                  ? 'rgba(106, 110, 160, 0.9)'
                  : 'rgba(90, 110, 140, 0.8)',
        fontSize: 30,
        touchAction: 'none',
        userSelect: 'none',
        boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
        animation:
          pulse || workbench || campfire || crate || baitBarrel || smelter || bed
            ? 'tool-pulse 0.9s ease-in-out infinite'
            : 'none',
        ...fadeStyle(dimmed),
      }}
    >
      {workbench ? '🛠️' : campfire ? '🔥' : crate ? '📦' : baitBarrel ? '🪣' : smelter ? '🏭' : bed ? '🛏️' : TOOL_ICONS[tool]}
      {!workbench &&
        !campfire &&
        !crate &&
        !baitBarrel &&
        !smelter &&
        !bed &&
        (tool === 'bow' ||
          tool === 'fishingrod' ||
          tool === 'fence' ||
          tool === 'fenceGate') && (
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
          {tool === 'bow' ? arrowCount : tool === 'fishingrod' ? baitCount : fenceCount}
        </span>
      )}
      <style>{`@keyframes tool-pulse { 0%, 100% { scale: 1 } 50% { scale: 1.12 } }`}</style>
    </button>
  );
}
