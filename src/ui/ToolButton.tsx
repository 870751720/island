'use client';

import type { HandTool } from '@/game/entities/Player';
import type { ResourceKind } from '@/game/systems/Inventory';
import { ITEMS } from '@/game/systems/Items';
import { fadeStyle } from './fade';
import { ItemIcon, ToolIcon } from './ItemIcon';
import { useEffect, useRef, useState } from 'react';

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

/** 右中侧工具切换按钮:单击循环 空手 → 斧子 → 镐子 → 鱼竿 → 弓(仅已拥有的);pulse 时外圈提示可切换;
 * 长按(约 0.35s)打开可放置道具选择面板(传入 onLongPress 时启用);
 * 靠近工作台/火堆等放置物时切换为对应图标并以外圈短暂提示,点击打开对应面板;
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
  const [holding, setHolding] = useState(false);
  const contexts: [boolean, string][] = [
    [workbench, '工作台'], [campfire, '营火'], [crate, '木箱'],
    [baitBarrel, '饵料桶'], [brewBarrel, '酿酒桶'], [smelter, '冶炼炉'],
    [cookingStation, '烹饪台'], [loom, '纺织机'], [bed, '睡觉'],
    [stake, '打桩'], [untie, '解开套索'],
  ];
  const contextLabel = contexts.find(([active]) => active)?.[1];
  const toolLabel = placeKind && placeKind in ITEMS
    ? ITEMS[placeKind as ResourceKind].name
    : TOOL_LABELS[tool] ?? '工具';
  const label = contextLabel ?? toolLabel;
  const longFired = useRef(false);
  const activePointer = useRef<number | null>(null);
  const pressStart = useRef({ x: 0, y: 0 });
  useEffect(() => () => {
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
  }, []);
  useEffect(() => {
    if (dimmed) {
      if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
      activePointer.current = null;
      setHolding(false);
      longFired.current = true;
    }
  }, [dimmed]);
  const clearPress = () => {
    setHolding(false);
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };
  const tapAction = () => {
    clearPress();
    if (dimmed || longFired.current) return;
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
      className={`hud-control hud-tool${contextLabel ? ' is-context' : ''}`}
      disabled={dimmed}
      aria-label={`${contextLabel ? label : `切换工具，当前${label}`}${onLongPress ? '；长按选择工具或道具' : ''}`}
      onClick={(event) => {
        if (event.detail === 0) {
          longFired.current = false;
          tapAction();
        }
      }}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(e) => {
        e.preventDefault();
        if (e.button !== 0 || dimmed || activePointer.current !== null) return;
        activePointer.current = e.pointerId;
        longFired.current = false;
        pressStart.current = { x: e.clientX, y: e.clientY };
        clearPress();
        if (onLongPress && !dimmed) {
          setHolding(true);
          pressTimer.current = window.setTimeout(() => {
            pressTimer.current = null;
            longFired.current = true;
            setHolding(false);
            onLongPress();
          }, LONG_PRESS_MS);
        }
      }}
      onPointerMove={(e) => {
        if (activePointer.current !== e.pointerId || pressTimer.current === null || longFired.current) return;
        const dx = e.clientX - pressStart.current.x;
        const dy = e.clientY - pressStart.current.y;
        if (dx * dx + dy * dy > LONG_PRESS_SLOP * LONG_PRESS_SLOP) {
          clearPress();
          longFired.current = true;
        }
      }}
      onPointerUp={(event) => {
        if (activePointer.current !== event.pointerId) return;
        activePointer.current = null;
        tapAction();
      }}
      onPointerLeave={(event) => {
        if (activePointer.current !== event.pointerId) return;
        activePointer.current = null;
        clearPress();
        longFired.current = true;
      }}
      onPointerCancel={(event) => {
        if (activePointer.current !== event.pointerId) return;
        activePointer.current = null;
        clearPress();
        longFired.current = true;
      }}
      style={fadeStyle(dimmed)}
    >
      {(pulse || contextLabel) && <span key={contextLabel ?? 'equip'} className="hud-tool-cue" aria-hidden="true" />}
      {holding && <svg className="hud-hold-ring" viewBox="0 0 82 82" aria-hidden="true"><rect x="3" y="3" width="76" height="76" rx="26" pathLength="100" /></svg>}
      <span className="hud-tool-visual" key={`${tool}-${placeKind}-${contextLabel}`}>
      {workbench
        ? <ItemIcon kind="workbench1" level={null} size={30} />
        : campfire
          ? <ItemIcon kind="campfire" size={30} />
          : crate
            ? <ItemIcon kind="crate" size={30} />
            : baitBarrel
              ? <ItemIcon kind="baitBarrel" size={30} />
              : brewBarrel
                ? <ItemIcon kind="brewBarrel" size={30} />
                : smelter
                  ? <ItemIcon kind="smelter" size={30} />
                  : cookingStation
                    ? <ItemIcon kind="cookingStation" size={30} />
                    : loom
                      ? <ItemIcon kind="loom" size={30} />
                      : bed
                        ? <ItemIcon kind="bed1" level={null} size={30} />
                        : stake || untie
                          // 打桩/解绳都是套索动作,没有独立道具,统一用套索图标
                          ? <ItemIcon kind="lasso" size={30} />
                          // 土壤是工具驱动的零消耗设施:持锄头时图标跟工具走,不落入道具分支
                          : placeKind && placeKind in ITEMS
                            ? <ItemIcon kind={placeKind as ResourceKind} size={30} />
                            : <ToolIcon tool={tool} size={30} />}
      </span>
      <span className="hud-control-label">{label}</span>
      {onLongPress && <span className="hud-tool-hint" aria-hidden="true">{holding ? '选择中…' : '长按选择'}</span>}
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
        <span className="hud-tool-count">
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
    </button>
  );
}
