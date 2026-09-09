'use client';

import { ItemIcon } from '../ItemIcon';
import { useMemo, useState } from 'react';
import { ITEMS, ITEM_CATEGORIES, itemCategory, type ItemCategory } from '@/game/systems/Items';
import { TOOL_IDS, toolName, type ToolId } from '@/game/systems/Crafting';
import type { ResourceKind } from '@/game/systems/Inventory';

/** 各分类的发放数量档:装备只有 +1,材料/食物提供 +50 快捷档,其余 +1/+5 */
function giveCounts(category: ItemCategory): number[] {
  if (category === '装备') return [1];
  if (category === '材料' || category === '食物') return [1, 5, 50];
  return [1, 5];
}

/** 物品 tab:按分类二级 tab 归类发放,工具按等级发放,可按名称筛选 */
export function ItemsTab({
  onGiveItem,
  onGiveTool,
  onPlaceSoil,
}: {
  onGiveItem: (kind: ResourceKind, count: number) => void;
  onGiveTool: (tool: ToolId, tier: 1 | 2 | 3) => void;
  /** 土壤是零消耗设施,没有背包道具:GM 直接在面前格开出一格 */
  onPlaceSoil: () => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ItemCategory>('材料');
  const toolSet = useMemo(() => new Set<string>(TOOL_IDS), []);
  const kinds = useMemo(
    () =>
      (Object.keys(ITEMS) as ResourceKind[]).filter(
        (k) => !toolSet.has(k) && itemCategory(k) === category && ITEMS[k].name.includes(query.trim())
      ),
    [query, toolSet, category]
  );
  const tools =
    category === '工具'
      ? TOOL_IDS.filter((id) => toolName(id, 1).includes(query.trim()))
      : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="筛选物品名…"
        style={{
          width: '100%',
          minHeight: 40,
          padding: '6px 12px',
          border: 'none',
          borderRadius: 10,
          background: 'rgba(0,0,0,0.06)',
          fontFamily: 'sans-serif',
          fontSize: 14,
          color: '#4a3b2a',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: 4 }}>
        {ITEM_CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)} style={{ ...(category === c ? catTabActiveStyle : catTabStyle), flex: 1 }}>
            {c}
          </button>
        ))}
      </div>
      <div style={{ maxHeight: '42vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tools.map((id) => (
          <div key={id} style={rowStyle}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ItemIcon kind={id} size={20} /> {toolName(id, 1)} / {toolName(id, 2)} / {toolName(id, 3)}
            </span>
            <span style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => onGiveTool(id, 1)} style={giveStyle}>
                基础
              </button>
              <button onClick={() => onGiveTool(id, 2)} style={giveStyle}>
                二级
              </button>
              <button onClick={() => onGiveTool(id, 3)} style={giveStyle}>
                三级
              </button>
            </span>
          </div>
        ))}
        {category === '设施' && (
          <div style={rowStyle}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>🟫</span> 土壤
            </span>
            <span style={{ display: 'flex', gap: 6 }}>
              <button onClick={onPlaceSoil} style={giveStyle}>
                放面前
              </button>
            </span>
          </div>
        )}
        {kinds.map((kind) => {
          const item = ITEMS[kind];
          return (
            <div key={kind} style={rowStyle}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ItemIcon kind={kind} size={20} /> {item.name}
              </span>
              <span style={{ display: 'flex', gap: 6 }}>
                {/* 装备一次一件;材料/食物加发 +50 档 */}
                {giveCounts(category).map((n) => (
                  <button key={n} onClick={() => onGiveItem(kind, n)} style={giveStyle}>
                    +{n}
                  </button>
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '6px 12px',
  borderRadius: 10,
  background: 'rgba(0,0,0,0.06)',
  fontSize: 14,
  color: '#4a3b2a',
  fontFamily: 'sans-serif',
} as const;

const giveStyle = {
  minWidth: 44,
  height: 36,
  border: 'none',
  borderRadius: 8,
  background: '#8a6f4b',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
} as const;

const catTabStyle = {
  minHeight: 28,
  padding: '2px 0',
  border: 'none',
  borderRadius: 14,
  background: 'rgba(0,0,0,0.06)',
  color: '#4a3b2a',
  fontSize: 12,
  fontFamily: 'sans-serif',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
} as const;

const catTabActiveStyle = {
  ...catTabStyle,
  background: '#8a6f4b',
  color: '#fff',
  fontWeight: 700,
} as const;
