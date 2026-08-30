'use client';

import { useRef, useState } from 'react';
import type { HudSnapshot } from '@/game/Game';
import type { InventorySlot, ResourceKind } from '@/game/systems/Inventory';
import { ITEMS } from '@/game/systems/Items';
import { FOODS } from '@/game/systems/Food';
import { RECIPES, TOOL_IDS, WORKBENCH_COST, recipeVisible, toolName, type CraftId } from '@/game/systems/Crafting';
import { CAMPFIRE_COST } from '@/game/systems/CampfireSystem';
import { EQUIPMENT, SLOT_NAMES, SLOT_ORDER, isEquipKind, type EquipSlot } from '@/game/systems/Equipment';
import { workbenchItemLevel } from '@/game/systems/WorkbenchSystem';
import { bedItemLevel } from '@/game/systems/BedSystem';
import { fadeStyle } from './fade';

type Props = {
  open: boolean;
  onToggle: () => void;
  hud: HudSnapshot;
  /** 使用(吃)该食物道具,由外层触发进食并关闭背包 */
  onUseItem: (kind: ResourceKind) => void;
  /** 丢弃指定数量的道具到地上 */
  onDropItem: (kind: ResourceKind, count: number) => void;
  /** 在背包里发起手搓制作(站定敲打完成后入包/装备) */
  onCraft: (id: CraftId) => void;
  /** 在背包里发起搭建工作台(全局唯一,材料齐且场上没有时显示) */
  onCraftWorkbench: () => void;
  /** 在背包里发起原地搭小火堆(材料齐、位置可摆即可,火堆数量不限) */
  onCraftCampfire: () => void;
  /** 从背包装备一件装备(物品详情点击「装备」) */
  onEquip: (kind: ResourceKind) => void;
  /** 卸下某栏位装备放回背包 */
  onUnequip: (slot: EquipSlot) => void;
  /** 拖拽背包格:把 from 格道具移到 to 格(同类合并,异类互换) */
  onMoveItem: (from: number, to: number) => void;
};

type Tab = 'items' | 'craft' | 'tools' | 'char';

/** 可「使用」的道具:食物(进食)、种子(原地种树)、漂流瓶(读瓶中信)、挖来的丛/木箱/工作台(原地放下) */
function isUsable(kind: ResourceKind): boolean {
  return (
    FOODS.some((f) => f.kind === kind) ||
    kind === 'bottle' ||
    kind === 'berryBush' ||
    kind === 'oakSeed' ||
    kind === 'pineSeed' ||
    kind === 'fruitSeed' ||
    kind === 'shrubBush' ||
    kind === 'grassTuft' ||
    kind === 'crate' ||
    kind === 'fenceWood' ||
    kind === 'fenceStone' ||
    kind === 'fenceGate' ||
    workbenchItemLevel(kind) !== null ||
    bedItemLevel(kind) !== null
  );
}

const SLOT_SIZE = 52;
const SLOT_GAP = 8;
const COLUMNS = 5;
const TAB_LABELS: Record<Tab, string> = { items: '物品', craft: '制作', tools: '工具', char: '角色' };
const TABS = Object.keys(TAB_LABELS) as Tab[];
/** 双击判定窗口(毫秒):同一格两次点击间隔小于该值视为双击 */
const DOUBLE_TAP_MS = 350;
/** 拖拽判定阈值(像素):按住后位移超过该值才进入拖动 */
const DRAG_THRESHOLD = 12;

/** 物品详情区固定最小高度:与选中道具时(标题行+两行描述+按钮行)等高,空态不塌陷 */
const DETAIL_AREA_STYLE: React.CSSProperties = {
  minHeight: 130,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: 8,
};

function slotStyle(filled: boolean, selected: boolean): React.CSSProperties {
  return {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: 10,
    border: selected ? '2px solid #4caf50' : '2px solid rgba(0,0,0,0.12)',
    background: filled ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    position: 'relative',
    touchAction: 'none',
    userSelect: 'none',
    boxSizing: 'border-box',
  };
}

function countBadge(count: number): React.ReactNode {
  return (
    <span
      style={{
        position: 'absolute',
        right: 3,
        bottom: 1,
        fontSize: 11,
        fontWeight: 700,
        color: '#555',
        fontFamily: 'sans-serif',
      }}
    >
      ×{count}
    </span>
  );
}

function actionButton(disabled: boolean, label: string, color: string, onPress: () => void): React.ReactNode {
  return (
    <button
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        if (!disabled) onPress();
      }}
      style={{
        flex: 1,
        padding: '10px 0',
        borderRadius: 10,
        border: 'none',
        background: disabled ? '#bbb' : color,
        color: '#fff',
        fontSize: 15,
        fontWeight: 700,
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {label}
    </button>
  );
}

/** 面板内容区通用纵向布局 */
const CONTENT_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  paddingTop: 10,
};

/** 点击图标弹出的物品 tip:锚定在触发图标的屏幕位置附近(优先上方) */
type TipState = { x: number; y: number; content: React.ReactNode };

function Tip({ tip, onClose }: { tip: TipState; onClose: () => void }) {
  const WIDTH = 230;
  const left = Math.min(Math.max(tip.x - WIDTH / 2, 10), window.innerWidth - WIDTH - 10);
  const showAbove = tip.y > window.innerHeight * 0.4;
  return (
    <>
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          onClose();
        }}
        style={{ position: 'fixed', inset: 0, zIndex: 60 }}
      />
      <div
        style={{
          position: 'fixed',
          left,
          top: showAbove ? undefined : tip.y + 14,
          bottom: showAbove ? window.innerHeight - tip.y + 14 : undefined,
          width: WIDTH,
          padding: '10px 12px',
          background: 'rgba(255,255,255,0.98)',
          borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          fontFamily: 'sans-serif',
          fontSize: 13,
          color: '#333',
          lineHeight: 1.5,
          zIndex: 61,
        }}
      >
        {tip.content}
      </div>
    </>
  );
}

/** 背包面板:顶部固定 物品/制作/工具/角色 四个 tab;
 * 物品页 = 格子背包 + 选中道具详情(单击选中,双击直接使用/装备),
 * 制作页独占整页;工具/角色页为行式列表,点击行首图标弹出对应物品 tip */
export function Backpack({ open, onToggle, hud, onUseItem, onDropItem, onCraft, onCraftWorkbench, onCraftCampfire, onEquip, onUnequip, onMoveItem }: Props) {
  const [tab, setTab] = useState<Tab>('items');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  /** 待丢弃数量:选中道具时重置为 1 */
  const [dropCount, setDropCount] = useState(1);
  const [tip, setTip] = useState<TipState | null>(null);
  /** 最近一次点击格子的时间与下标,用于双击判定 */
  const lastTap = useRef<{ index: number; time: number } | null>(null);
  /** 格子拖拽:按住并移动超过阈值后进入拖动,松手落在目标格 */
  const gridRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ from: number; startX: number; startY: number; moved: boolean } | null>(null);
  const [drag, setDrag] = useState<{ from: number; x: number; y: number } | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const selected: InventorySlot = selectedIndex !== null ? hud.slots[selectedIndex] : null;
  const selectedDef = selected ? ITEMS[selected.kind] : null;
  const tools = hud.toolTiers;
  // 背包空但已拥有工具时仍显示背包按钮(工具 tab 在里面)
  const showBackpackButton = hud.slots.some((slot) => !!slot) || TOOL_IDS.some((id) => tools[id]);
  // 手搓配方:只显示当前能做的(材料齐、工具未拥有、装备评分高于身上这件)
  const craftables = RECIPES.filter(
    (r) => r.station === 'hand' && recipeVisible(r, hud, tools, hud.equipped, hud.slots)
  );

  /** 记录图标点击位置用于定位 tip(优先弹在图标上方) */
  const openTip = (e: React.PointerEvent, content: React.ReactNode) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTip({ x: rect.left + rect.width / 2, y: rect.top, content });
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setSelectedIndex(null);
    setTip(null);
  };

  /** 由指针屏幕坐标换算命中的格子下标(格子尺寸/间距固定,按网格几何计算,触屏指针捕获时依然有效) */
  const slotIndexAt = (clientX: number, clientY: number): number | null => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const pitch = SLOT_SIZE + SLOT_GAP;
    const col = Math.floor((clientX - rect.left - SLOT_GAP / 2) / pitch);
    const row = Math.floor((clientY - rect.top - SLOT_GAP / 2) / pitch);
    if (col < 0 || col >= COLUMNS || row < 0) return null;
    const index = row * COLUMNS + col;
    return index < hud.capacity ? index : null;
  };

  const cancelDrag = () => {
    dragRef.current = null;
    setDrag(null);
    setHoverIndex(null);
  };

  return (
    <>
      {showBackpackButton && (
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          onToggle();
        }}
        style={{
          position: 'absolute',
          // 位于右中侧工具按钮正上方(工具按钮 top 50%、高 72px)
          top: 'calc(50% - 36px - 72px - 12px)',
          right: 'max(16px, env(safe-area-inset-right))',
          width: 72,
          height: 72,
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(255,255,255,0.75)',
          fontSize: 24,
          touchAction: 'none',
          userSelect: 'none',
          ...fadeStyle(hud.busy),
        }}
      >
        🎒
      </button>
      )}
      {open && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.35)',
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            // 点到遮罩本身才关闭,面板内点击不冒泡关闭
            if (e.target === e.currentTarget) onToggle();
          }}
        >
          <div
            style={{
              // 顶边对齐旧版居中面板的位置(按旧面板约 520px 高折算),内容增多时向下生长
              marginTop: 'max(12px, calc(50vh - 260px))',
              width: `min(88vw, ${COLUMNS * (SLOT_SIZE + SLOT_GAP) + 2 * SLOT_GAP + 24}px)`,
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '12px',
              background: 'rgba(255,255,255,0.95)',
              borderRadius: 14,
              fontFamily: 'sans-serif',
              fontSize: 15,
              color: '#333',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            }}
          >
            {/* 固定在面板顶部的 tab 栏 */}
            <div style={{ display: 'flex', gap: 6 }}>
              {TABS.map((t) => (
                <button
                  key={t}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    switchTab(t);
                  }}
                  style={{
                    flex: 1,
                    padding: '7px 0',
                    borderRadius: 8,
                    border: 'none',
                    background: tab === t ? '#4caf50' : 'rgba(0,0,0,0.08)',
                    color: tab === t ? '#fff' : '#666',
                    fontSize: 14,
                    fontWeight: 700,
                    touchAction: 'none',
                    userSelect: 'none',
                  }}
                >
                  {TAB_LABELS[t]}
                </button>
              ))}
            </div>

            {tab === 'items' ? (
              <>
                <div style={{ fontWeight: 700, margin: '10px 2px 8px' }}>背包</div>
                <div
                  ref={gridRef}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${COLUMNS}, ${SLOT_SIZE}px)`,
                    gap: SLOT_GAP,
                    justifyContent: 'center',
                  }}
                >
                  {Array.from({ length: hud.capacity }, (_, i) => {
                    const slot = hud.slots[i];
                    return (
                      <div
                        key={i}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          if (!slot) return;
                          // 捕获指针:移动/抬起事件始终回到起始格,触屏与鼠标行为一致
                          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                          dragRef.current = { from: i, startX: e.clientX, startY: e.clientY, moved: false };
                        }}
                        onPointerMove={(e) => {
                          const d = dragRef.current;
                          if (!d || d.from !== i) return;
                          if (!d.moved) {
                            if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD) return;
                            d.moved = true;
                          }
                          setDrag({ from: d.from, x: e.clientX, y: e.clientY });
                          setHoverIndex(slotIndexAt(e.clientX, e.clientY));
                        }}
                        onPointerUp={(e) => {
                          const d = dragRef.current;
                          if (!d || d.from !== i) return;
                          if (d.moved) {
                            const target = slotIndexAt(e.clientX, e.clientY);
                            cancelDrag();
                            if (target !== null && target !== d.from) {
                              setSelectedIndex(null);
                              onMoveItem(d.from, target);
                            }
                            return;
                          }
                          cancelDrag();
                          if (!slot) return;
                          // 双击同一格:可直接使用(食物/漂流瓶)或装备
                          const now = Date.now();
                          const isDoubleTap =
                            lastTap.current?.index === i && now - lastTap.current.time < DOUBLE_TAP_MS;
                          lastTap.current = { index: i, time: now };
                          if (isDoubleTap && (isUsable(slot.kind) || isEquipKind(slot.kind))) {
                            lastTap.current = null;
                            setSelectedIndex(null);
                            if (isUsable(slot.kind)) onUseItem(slot.kind);
                            else onEquip(slot.kind);
                            return;
                          }
                          setSelectedIndex(selectedIndex === i ? null : i);
                          setDropCount(1);
                        }}
                        onPointerCancel={cancelDrag}
                        style={slotStyle(!!slot, selectedIndex === i || (drag !== null && hoverIndex === i))}
                      >
                        {slot && (
                          <>
                            <span style={drag?.from === i ? { opacity: 0.3 } : undefined}>{ITEMS[slot.kind].icon}</span>
                            {countBadge(slot.count)}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={DETAIL_AREA_STYLE}>
                  {selected && selectedDef ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 24 }}>{selectedDef.icon}</span>
                        <span style={{ fontWeight: 700, flex: 1 }}>{selectedDef.name}</span>
                        <span style={{ color: '#888' }}>×{selected.count}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
                        {selectedDef.description}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {isUsable(selectedDef.kind) &&
                          actionButton(false, '使用', '#4caf50', () => {
                            setSelectedIndex(null);
                            onUseItem(selectedDef.kind);
                          })}
                        {isEquipKind(selectedDef.kind) &&
                          actionButton(false, `装备(评分${EQUIPMENT[selectedDef.kind].score})`, '#4caf50', () => {
                            onEquip(selectedDef.kind);
                            setSelectedIndex(null);
                          })}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                        {/* 丢弃数量步进:- 数量 +,默认 1 */}
                        {[-1, 1].map((step) => (
                          <button
                            key={step}
                            onPointerDown={(e) => {
                              e.preventDefault();
                              setDropCount((c) =>
                                Math.min(selected.count, Math.max(1, c + step))
                              );
                            }}
                            style={{
                              width: 44,
                              borderRadius: 10,
                              border: 'none',
                              background: 'rgba(0,0,0,0.08)',
                              color: '#555',
                              fontSize: 20,
                              fontWeight: 700,
                              touchAction: 'none',
                              userSelect: 'none',
                            }}
                          >
                            {step < 0 ? '−' : '+'}
                          </button>
                        ))}
                        <span
                          style={{
                            minWidth: 40,
                            textAlign: 'center',
                            alignSelf: 'center',
                            fontWeight: 700,
                            color: '#555',
                          }}
                        >
                          {dropCount}
                        </span>
                        {actionButton(false, `丢弃${dropCount > 1 ? ` ${dropCount}` : ''}`, '#e67e22', () => {
                          onDropItem(selectedDef.kind, dropCount);
                          setSelectedIndex(null);
                        })}
                        {selected.count > 1 &&
                          actionButton(false, '全丢', '#c0392d', () => {
                            onDropItem(selectedDef.kind, selected.count);
                            setSelectedIndex(null);
                          })}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: '#999', textAlign: 'center' }}>
                      点击选中物品,双击可直接使用或装备;长按拖动可交换位置
                    </div>
                  )}
                </div>
              </>
            ) : tab === 'craft' ? (
              <div style={CONTENT_STYLE}>
                {craftables.length === 0 && !hud.canCraftWorkbench && !hud.canBuildCampfire && (
                  <div style={{ fontSize: 13, color: '#999', textAlign: 'center', padding: '14px 0' }}>
                    暂时没有能手搓的东西
                  </div>
                )}
                {hud.canBuildCampfire && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px' }}>
                    <span style={{ fontSize: 22 }}>🔥</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div>小火堆</div>
                      <div style={{ fontSize: 12, color: '#888' }}>
                        {Object.entries(CAMPFIRE_COST)
                          .filter(([, n]) => !!n)
                          .map(([k, n]) => `${n}${ITEMS[k as ResourceKind].name}`)
                          .join(' + ')}
                      </div>
                    </div>
                    {actionButton(false, '搭建', '#4caf50', onCraftCampfire)}
                  </div>
                )}
                {hud.canCraftWorkbench && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px' }}>
                    <span style={{ fontSize: 22 }}>🛠️</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div>工作台</div>
                      <div style={{ fontSize: 12, color: '#888' }}>
                        {Object.entries(WORKBENCH_COST)
                          .filter(([, n]) => !!n)
                          .map(([k, n]) => `${n}${ITEMS[k as ResourceKind].name}`)
                          .join(' + ')}
                      </div>
                    </div>
                    {actionButton(false, '制作', '#4caf50', onCraftWorkbench)}
                  </div>
                )}
                {craftables.map((r) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px' }}>
                    <span style={{ fontSize: 22 }}>{r.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div>{r.name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>
                        {Object.entries(r.cost)
                          .filter(([, n]) => !!n)
                          .map(([k, n]) => `${n}${ITEMS[k as ResourceKind].name}`)
                          .join(' + ')}
                      </div>
                    </div>
                    {actionButton(false, '制作', '#4caf50', () => onCraft(r.id))}
                  </div>
                ))}
              </div>
            ) : tab === 'tools' ? (
              <div style={CONTENT_STYLE}>
                {TOOL_IDS.map((id) => {
                  const def = ITEMS[id];
                  const tier = hud.toolTiers[id];
                  const owned = tier > 0;
                  const name = toolName(id, tier);
                  return (
                    <div
                      key={id}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        openTip(
                          e,
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 20 }}>{def.icon}</span>
                              <span style={{ fontWeight: 700, flex: 1 }}>{name}</span>
                              <span style={{ fontSize: 12, color: owned ? '#4caf50' : '#999', fontWeight: 700 }}>
                                {owned ? (tier >= 2 ? '已升级' : '已拥有') : '未拥有'}
                              </span>
                            </div>
                            <div style={{ marginTop: 4 }}>{def.description}</div>
                          </>
                        );
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 4px',
                        opacity: owned ? 1 : 0.45,
                        touchAction: 'none',
                        userSelect: 'none',
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{def.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>{name}</div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: owned ? '#4caf50' : '#999' }}>
                        {owned ? (tier >= 2 ? '已升级' : '已拥有') : '未拥有'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={CONTENT_STYLE}>
                {SLOT_ORDER.map((slot) => {
                  const kind = hud.equipped[slot];
                  const def = kind ? ITEMS[kind] : null;
                  const score = kind ? EQUIPMENT[kind].score : null;
                  return (
                    <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        onPointerDown={(e) => {
                          e.preventDefault();
                          openTip(
                            e,
                            def && kind ? (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 20 }}>{def.icon}</span>
                                  <span style={{ fontWeight: 700, flex: 1 }}>{def.name}</span>
                                  <span style={{ fontSize: 12, color: '#888' }}>评分 {EQUIPMENT[kind].score}</span>
                                </div>
                                <div style={{ marginTop: 4, color: '#666' }}>{def.description}</div>
                              </>
                            ) : (
                              <div style={{ textAlign: 'center', color: '#999' }}>
                                {SLOT_NAMES[slot]}:未装备
                              </div>
                            )
                          );
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flex: 1,
                          minWidth: 0,
                          touchAction: 'none',
                          userSelect: 'none',
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{def ? def.icon : '➖'}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: '#999' }}>{SLOT_NAMES[slot]}</div>
                          <div style={{ fontWeight: 700 }}>
                            {def ? def.name : '未装备'}
                            {score !== null && (
                              <span style={{ fontSize: 12, color: '#888', fontWeight: 400, marginLeft: 6 }}>
                                评分 {score}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {kind && actionButton(false, '卸下', '#e67e22', () => onUnequip(slot))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {tip && <Tip tip={tip} onClose={() => setTip(null)} />}
      {drag && hud.slots[drag.from] && (
        <div
          style={{
            position: 'fixed',
            left: drag.x - SLOT_SIZE / 2,
            top: drag.y - SLOT_SIZE / 2,
            width: SLOT_SIZE,
            height: SLOT_SIZE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.95)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
            zIndex: 70,
          }}
        >
          {ITEMS[hud.slots[drag.from]!.kind].icon}
        </div>
      )}
    </>
  );
}
