'use client';

import { ItemIcon } from './ItemIcon';
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  RECIPES,
  recipeCategory,
  recipeIconKind,
  recipeIconLevel,
  type CraftId,
  type Recipe,
} from '@/game/systems/Crafting';
import { ITEMS, ITEM_CATEGORIES } from '@/game/systems/Items';
import { EQUIPMENT, isEquipKind } from '@/game/systems/Equipment';
import { recipeCostLabel } from './materials';

const STATION_NAMES: Record<Recipe['station'], string> = {
  hand: '手搓',
  workbench: '工作台',
};

/** 二级工具的增益说明 */
const REFINED_EFFECTS: Record<string, string> = {
  'refined-axe': '砍树 2 下、树桩 2 下,制作后替换木斧。',
  'refined-pickaxe': '解锁铁矿开采;岩石 4 下、铁矿 5 下,制作后替换木镐。',
  'refined-hoe': '挖掘放置物 2 下挖走,制作后替换木锄。',
  'refined-sword': '近战武器,制作后替换木剑。',
  'refined-fishingrod': '等待咬钩时间 ×0.8,咬钩反应窗口 ×1.2,制作后替换树枝鱼竿。',
  'refined-bow': '箭矢伤害 2 点,射击冷却 3 秒 → 2 秒,制作后替换树枝弓。',
};

/** 三级(铁制)工具的增益说明 */
const IRON_EFFECTS: Record<string, string> = {
  'iron-axe': '砍树 1 下、树桩 1 下,制作后替换石斧。',
  'iron-pickaxe': '解锁陨石开采;岩石 2 下、铁矿 3 下、陨石 5 下,制作后替换石镐。',
  'iron-hoe': '挖掘放置物 1 下挖走,制作后替换石锄。',
  'iron-fishingrod': '等待咬钩时间 ×0.6,咬钩反应窗口 ×1.5,制作后替换木鱼竿。',
};

/** 单条配方的产物说明:装备评分/背包扩容,其他道具用道具描述首句 */
function effectText(recipe: Recipe): string | null {
  if (recipe.output && isEquipKind(recipe.output)) {
    const def = EQUIPMENT[recipe.output];
    const parts = [`装备评分 ${def.score}`];
    if (def.capacity) parts.push(`背包 ${def.capacity} 格`);
    return parts.join(' · ');
  }
  if (recipe.tool && recipe.tier === 2) return REFINED_EFFECTS[recipe.id] ?? null;
  if (recipe.tool && recipe.tier === 3) return IRON_EFFECTS[recipe.id] ?? null;
  if (recipe.output) {
    const desc = ITEMS[recipe.output].description;
    return desc.split('。')[0] + '。';
  }
  return null;
}

/** 合成图鉴:按分类 tab 列出配方(产物、材料、站点与效果),随时可查,不判断材料够不够 */
export function RecipeBook({
  onClose,
  maxBenchLevel,
  craftedIds,
}: {
  onClose: () => void;
  /** 传入时隐藏需求等级更高的配方(如工作台面板内查看) */
  maxBenchLevel?: number;
  /** 已制作过的配方 id(展示「已制作」标签) */
  craftedIds?: readonly CraftId[];
}) {
  const grouped = useMemo(
    () =>
      ITEM_CATEGORIES.map((category) => ({
        category,
        recipes: RECIPES.filter(
          (r) =>
            recipeCategory(r) === category &&
            (maxBenchLevel === undefined || (r.minBenchLevel ?? 1) <= maxBenchLevel)
        ),
      })).filter((g) => g.recipes.length > 0),
    [maxBenchLevel]
  );
  const [category, setCategory] = useState(grouped[0].category);
  const crafted = useMemo(() => new Set(craftedIds ?? []), [craftedIds]);

  return (
    <div
      style={overlayStyle}
      onPointerDown={(e) => {
        e.preventDefault();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={panelStyle}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 10 }}>📖 合成图鉴</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {grouped.map(({ category: c, recipes }) => (
            <button
              key={c}
              onPointerDown={(e) => {
                e.preventDefault();
                setCategory(c);
              }}
              style={{ ...(category === c ? tabActiveStyle : tabStyle), flex: 1 }}
            >
              {c}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {grouped
            .find((g) => g.category === category)!
            .recipes.map((r) => (
              <div key={r.id} style={rowStyle}>
                <ItemIcon kind={recipeIconKind(r)} level={recipeIconLevel(r)} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{r.name}</span>
                    {crafted.has(r.id) && <span style={craftedTagStyle}>已制作</span>}
                    <span style={tagStyle}>
                      {STATION_NAMES[r.station]}
                      {r.minBenchLevel && r.minBenchLevel > 1 ? `·Lv${r.minBenchLevel}` : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {recipeCostLabel(r, ' + ')}
                  </div>
                  {effectText(r) && (
                    <div style={{ fontSize: 12, color: '#999' }}>{effectText(r)}</div>
                  )}
                </div>
              </div>
            ))}
        </div>
        <button style={closeButtonStyle} onPointerDown={(e) => { e.preventDefault(); onClose(); }}>
          关闭
        </button>
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 70,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.35)',
};

const panelStyle: CSSProperties = {
  width: 'min(92vw, 400px)',
  maxHeight: '80vh',
  overflowY: 'auto',
  padding: '16px 14px',
  background: 'rgba(255,255,255,0.95)',
  borderRadius: 14,
  fontFamily: 'sans-serif',
  fontSize: 15,
  color: '#333',
  boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 10px',
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.08)',
  background: 'rgba(255,255,255,0.8)',
};

const tagStyle: CSSProperties = {
  padding: '1px 8px',
  borderRadius: 6,
  background: 'rgba(0,0,0,0.08)',
  color: '#777',
  fontSize: 11,
};

const craftedTagStyle: CSSProperties = {
  padding: '1px 8px',
  borderRadius: 6,
  background: 'rgba(76,175,80,0.15)',
  color: '#2e7d32',
  fontSize: 11,
};

const tabStyle = {
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

const tabActiveStyle = {
  ...tabStyle,
  background: '#8a6f4b',
  color: '#fff',
  fontWeight: 700,
} as const;

const closeButtonStyle: CSSProperties = {
  width: '100%',
  marginTop: 12,
  padding: '10px 0',
  borderRadius: 10,
  border: 'none',
  background: 'rgba(0,0,0,0.1)',
  fontSize: 15,
  touchAction: 'none',
  userSelect: 'none',
};
