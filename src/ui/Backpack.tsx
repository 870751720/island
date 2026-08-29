'use client';

import { useState } from 'react';
import type { HudSnapshot } from '@/game/Game';
import type { InventorySlot, ResourceKind } from '@/game/systems/Inventory';
import { ITEMS } from '@/game/systems/Items';
import { FOODS } from '@/game/systems/Food';
import { RECIPES, TOOL_IDS, WORKBENCH_COST, recipeVisible, type CraftId, type ToolId } from '@/game/systems/Crafting';
import { EQUIPMENT, SLOT_NAMES, SLOT_ORDER, isEquipKind, type EquipSlot } from '@/game/systems/Equipment';

type Props = {
  open: boolean;
  onToggle: () => void;
  hud: HudSnapshot;
  /** 使用(吃)该食物道具,由外层触发进食并关闭背包 */
  onUseItem: (kind: ResourceKind) => void;
  /** 丢弃一个该道具到地上 */
  onDropItem: (kind: ResourceKind) => void;
  /** 在背包里发起手搓制作(站定敲打完成后入包/装备) */
  onCraft: (id: CraftId) => void;
  /** 在背包里发起搭建工作台(全局唯一,材料齐且场上没有时显示) */
  onCraftWorkbench: () => void;
  /** 从背包装备一件装备(物品详情点击「装备」) */
  onEquip: (kind: ResourceKind) => void;
  /** 卸下某栏位装备放回背包 */
  onUnequip: (slot: EquipSlot) => void;
};

/** 可「使用」的道具:食物(进食)与漂流瓶(读瓶中信) */
function isUsable(kind: ResourceKind): boolean {
  return FOODS.some((f) => f.kind === kind) || kind === 'bottle';
}

const SLOT_SIZE = 52;
const SLOT_GAP = 8;
const COLUMNS = 5;
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

/** 背包:格子制(相同道具叠加,默认 10 格);下方固定 Tab 区域——
 * 物品页展示选中道具详情(可使用/丢弃),制作页只列出当前可手搓的配方,
 * 工具页展示永久拥有的工具与描述,角色页展示装备栏 */
export function Backpack({ open, onToggle, hud, onUseItem, onDropItem, onCraft, onCraftWorkbench, onEquip, onUnequip }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedTool, setSelectedTool] = useState<ToolId | null>(null);
  const [tab, setTab] = useState<'detail' | 'craft' | 'tools' | 'char'>('detail');
  const selected: InventorySlot = selectedIndex !== null ? hud.slots[selectedIndex] : null;
  const selectedDef = selected ? ITEMS[selected.kind] : null;
  const tools = { axe: hud.hasAxe, pickaxe: hud.hasPickaxe, fishingrod: hud.hasFishingrod, bow: hud.hasBow };
  // 背包空但已拥有工具时仍显示背包按钮(工具 tab 在里面)
  const showBackpackButton = hud.slots.some((slot) => !!slot) || TOOL_IDS.some((id) => tools[id]);
  // 手搓配方:只显示当前能做的(材料齐、工具未拥有、装备评分高于身上这件)
  const craftables = RECIPES.filter(
    (r) => r.station === 'hand' && recipeVisible(r, hud, tools, hud.equipped, hud.slots)
  );

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
            alignItems: 'center',
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
              width: `min(88vw, ${COLUMNS * (SLOT_SIZE + SLOT_GAP) + 2 * SLOT_GAP + 24}px)`,
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '14px 12px',
              background: 'rgba(255,255,255,0.95)',
              borderRadius: 14,
              fontFamily: 'sans-serif',
              fontSize: 15,
              color: '#333',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ fontWeight: 700, margin: '0 2px 8px' }}>背包</div>
            <div
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
                      if (slot) {
                        setSelectedIndex(selectedIndex === i ? null : i);
                        setTab('detail');
                      }
                    }}
                    style={slotStyle(!!slot, selectedIndex === i)}
                  >
                    {slot && (
                      <>
                        <span>{ITEMS[slot.kind].icon}</span>
                        {countBadge(slot.count)}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 双 Tab:物品详情 / 手搓制作,区域固定常显不收起 */}
            <div
              style={{
                marginTop: 10,
                paddingTop: 8,
                borderTop: '1px solid rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {(['detail', 'craft', 'tools', 'char'] as const).map((t) => (
                  <button
                    key={t}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setTab(t);
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
                    {t === 'detail' ? '物品' : t === 'craft' ? '制作' : t === 'tools' ? '工具' : '角色'}
                  </button>
                ))}
              </div>

              {tab === 'detail' ? (
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
                        {actionButton(false, '丢弃', '#e67e22', () => {
                          onDropItem(selectedDef.kind);
                          setSelectedIndex(null);
                        })}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: '#999', textAlign: 'center' }}>
                      点击上方物品查看详情
                    </div>
                  )}
                </div>
              ) : tab === 'craft' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {craftables.length === 0 && !hud.canCraftWorkbench && (
                    <div style={{ fontSize: 13, color: '#999', textAlign: 'center', padding: '14px 0' }}>
                      暂时没有能手搓的东西
                    </div>
                  )}
                  {hud.canCraftWorkbench && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 4px',
                      }}
                    >
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
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 4px',
                      }}
                    >
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {TOOL_IDS.map((id) => {
                    const def = ITEMS[id];
                    const owned = tools[id];
                    return (
                      <div key={id}>
                        <div
                          onPointerDown={(e) => {
                            e.preventDefault();
                            setSelectedTool(selectedTool === id ? null : id);
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
                          <div style={{ flex: 1, minWidth: 0 }}>{def.name}</div>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: owned ? '#4caf50' : '#999',
                            }}
                          >
                            {owned ? '已拥有' : '未拥有'}
                          </span>
                        </div>
                        {selectedTool === id && (
                          <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5, padding: '0 4px 4px' }}>
                            {def.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>
                    工具制作一次永久拥有,不会占用背包
                  </div>
                </div>
              ) : (
                <div style={DETAIL_AREA_STYLE}>
                  {SLOT_ORDER.map((slot) => {
                    const kind = hud.equipped[slot];
                    const def = kind ? ITEMS[kind] : null;
                    const score = kind ? EQUIPMENT[kind].score : null;
                    return (
                      <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{def ? def.icon : '➖'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
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
                        {kind &&
                          actionButton(false, '卸下', '#e67e22', () => onUnequip(slot))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
