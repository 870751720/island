'use client';

import type { HandTool } from '@/game/entities/Player';
import type { ResourceKind } from '@/game/systems/Inventory';
import { ITEMS } from '@/game/systems/Items';
import { fadeStyle } from './fade';
import { useRef } from 'react';

export const TOOL_ICONS: Record<HandTool, string> = {
  hand: '✋',
  axe: '🪓',
  pickaxe: '⛏️',
  shovel: '🥄',
  hoe: '🌱',
  fishingrod: '🎣',
  bow: '🏹',
  sword: '🗡️',
  lasso: '🪢',
  fence: '🚧',
  fenceGate: '🪵',
  place: '📦',
};

/** 普通工具的显示名(手持选择面板用;手持道具类名称走 ITEMS) */
export const TOOL_LABELS: Partial<Record<HandTool, string>> = {
  hand: '空手',
  axe: '斧子',
  pickaxe: '镐子',
  shovel: '铲子',
  hoe: '锄头',
  fishingrod: '鱼竿',
  bow: '弓',
  sword: '剑',
  lasso: '套索',
};

/** 右中侧工具切换按钮:单击循环 空手 → 斧子 → 镐子 → 鱼竿 → 弓(仅已拥有的);pulse 时轻缩放提示可切换;
 * 长按(约 0.35s)打开可放置道具选择面板(传入 onLongPress 时启用);
 * 靠近工作台/火堆等放置物时切换为对应图标并持续缩放提示,点击打开对应面板;
 * 牵着羊时变为「打桩」,身旁有被拴的羊时变为「解开套索」;
 * 持弓/鱼竿/围栏/套索时角标显示剩余弹药或个数 */
export function ToolButton({
  tool,
  pulse,
  workbench,
  campfire = false,
  crate = false,
  baitBarrel = false,
  brewBarrel = false,
  smelter = false,
  cookingStation = false,
  loom = false,
  bed = false,
  stake = false,
  untie = false,
  arrowCount = 0,
  baitCount = 0,
  fenceCount = 0,
  placeCount = 0,
  placeKind = null,
  lassoCount = 0,
  dimmed = false,
  onLongPress,
  onCycle,
  onWorkbench,
  onCampfire,
  onCrate,
  onBaitBarrel,
  onBrewBarrel,
  onSmelter,
  onCookingStation,
  onLoom,
  onBed,
  onStake,
  onUntie,
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
  /** 是否显示为酿酒桶模式(靠近酿酒桶) */
  brewBarrel?: boolean;
  /** 是否显示为冶炼炉模式(靠近冶炼炉) */
  smelter?: boolean;
  /** 是否显示为烹饪台模式(靠近烹饪台,点击打开烤制/煮汤面板) */
  cookingStation?: boolean;
  /** 是否显示为纺织机模式(靠近纺织机) */
  loom?: boolean;
  /** 是否显示为床模式(靠近床,点击开始睡觉) */
  bed?: boolean;
  /** 是否显示为打桩模式(牵着羊,点击在脚下打桩拴住) */
  stake?: boolean;
  /** 是否显示为解绳模式(身旁有被拴的羊,点击解开套索收回) */
  untie?: boolean;
  /** 背包剩余箭数(持弓时角标展示) */
  arrowCount?: number;
  /** 背包剩余鱼饵数(持鱼竿时角标展示) */
  baitCount?: number;
  /** 手持围栏/门时背包剩余个数(角标展示) */
  fenceCount?: number;
  placeCount?: number;
  /** 手持的可安放道具(图标跟随,缺省用 📦;工具驱动的零消耗设施如土壤也走此字段) */
  placeKind?: ResourceKind | 'soil' | null;
  /** 背包剩余套索数(持套索且未牵着羊时角标展示) */
  lassoCount?: number;
  /** 玩家移动/交互中:按钮淡出且不可点 */
  dimmed?: boolean;
  /** 长按打开可放置道具选择面板(不传则不响应长按) */
  onLongPress?: () => void;
  onCycle: () => void;
  onWorkbench: () => void;
  onCampfire: () => void;
  onCrate: () => void;
  onBaitBarrel: () => void;
  onBrewBarrel: () => void;
  onSmelter: () => void;
  onCookingStation: () => void;
  onLoom: () => void;
  onBed: () => void;
  onStake: () => void;
  onUntie: () => void;
}) {
  // 长按计时:按住不动约 0.35s 触发 onLongPress 并吞掉本次单击;提前抬起走普通点击,
  // 按住期间手指移动超过一小段(视为拖动/滑动)也取消长按,保证普通点按始终是循环切换
  const LONG_PRESS_MS = 350;
  const LONG_PRESS_SLOP = 12;
  const pressTimer = useRef<number | null>(null);
  const longFired = useRef(false);
  const pressStart = useRef({ x: 0, y: 0 });
  const clearPress = () => {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };
  const tapAction = () => {
    clearPress();
    if (longFired.current) return;
    workbench
      ? onWorkbench()
      : campfire
        ? onCampfire()
        : crate
          ? onCrate()
          : baitBarrel
            ? onBaitBarrel()
            : brewBarrel
              ? onBrewBarrel()
              : smelter
                ? onSmelter()
                : cookingStation
                  ? onCookingStation()
                  : loom
                    ? onLoom()
                    : bed
                      ? onBed()
                      : stake
                        ? onStake()
                        : untie
                          ? onUntie()
                          : onCycle();
  };
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        longFired.current = false;
        pressStart.current = { x: e.clientX, y: e.clientY };
        clearPress();
        if (onLongPress && !dimmed) {
          pressTimer.current = window.setTimeout(() => {
            pressTimer.current = null;
            longFired.current = true;
            onLongPress();
          }, LONG_PRESS_MS);
        }
      }}
      onPointerMove={(e) => {
        if (pressTimer.current === null || longFired.current) return;
        const dx = e.clientX - pressStart.current.x;
        const dy = e.clientY - pressStart.current.y;
        if (dx * dx + dy * dy > LONG_PRESS_SLOP * LONG_PRESS_SLOP) {
          clearPress();
          longFired.current = true;
        }
      }}
      onPointerUp={tapAction}
      onPointerLeave={() => {
        clearPress();
        longFired.current = true;
      }}
      onPointerCancel={() => {
        clearPress();
        longFired.current = true;
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
                : brewBarrel
                  ? 'rgba(122, 72, 64, 0.9)'
                  : smelter
                  ? 'rgba(125, 130, 136, 0.9)'
                  : cookingStation
                    ? 'rgba(196, 118, 74, 0.9)'
                    : loom
                      ? 'rgba(181, 166, 66, 0.9)'
                      : bed
                  ? 'rgba(106, 110, 160, 0.9)'
                  : stake
                    ? 'rgba(120, 96, 56, 0.9)'
                    : untie
                      ? 'rgba(96, 116, 96, 0.9)'
                      : 'rgba(90, 110, 140, 0.8)',
        fontSize: 30,
        touchAction: 'none',
        userSelect: 'none',
        boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
        animation:
          pulse ||
          workbench ||
          campfire ||
          crate ||
          baitBarrel ||
          brewBarrel ||
          smelter ||
          cookingStation ||
          loom ||
          bed ||
          stake ||
          untie
            ? 'tool-pulse 0.9s ease-in-out infinite'
            : 'none',
        ...fadeStyle(dimmed),
      }}
    >
      {workbench
        ? '🛠️'
        : campfire
          ? '🔥'
          : crate
            ? '📦'
            : baitBarrel
              ? '🪣'
              : brewBarrel
                ? '🍺'
                : smelter
                ? '🏭'
                : cookingStation
                  ? '🍳'
                  : loom
                    ? '🪡'
                    : bed
                  ? '🛏️'
                  : stake
                    ? '📍'
                    : untie
                      ? '🔓'
                      : placeKind
                        ? placeKind in ITEMS
                          ? ITEMS[placeKind as ResourceKind].icon
                          : '📦'
                        : TOOL_ICONS[tool]}
      {!workbench &&
        !campfire &&
        !crate &&
        !baitBarrel &&
        !brewBarrel &&
        !smelter &&
        !cookingStation &&
        !loom &&
        !bed &&
        !stake &&
        !untie &&
        (tool === 'bow' ||
          tool === 'fishingrod' ||
          tool === 'lasso' ||
          tool === 'fence' ||
          tool === 'fenceGate' ||
          tool === 'place') && (
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
          {tool === 'bow'
            ? arrowCount
            : tool === 'fishingrod'
              ? baitCount
              : tool === 'lasso'
                ? lassoCount
                : tool === 'place'
                  ? placeCount
                  : fenceCount}
        </span>
      )}
      <style>{`@keyframes tool-pulse { 0%, 100% { scale: 1 } 50% { scale: 1.12 } }`}</style>
    </button>
  );
}
