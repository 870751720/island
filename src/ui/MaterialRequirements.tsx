import type { Recipe, Tools } from '@/game/systems/Crafting';
import { toolName, toolUpgradeFrom } from '@/game/systems/Crafting';
import type { ResourceKind } from '@/game/systems/Inventory';
import { ITEMS } from '@/game/systems/Items';
import { gameTheme } from './gameTheme';

/** 材料缺口跟随当前玩家快照和制作份数实时计算。 */
export function MaterialRequirements({ cost, available, count = 1, recipe, tools }: {
  cost: Recipe['cost'];
  available: Partial<Record<ResourceKind, number>>;
  count?: number;
  recipe?: Recipe;
  tools?: Tools;
}) {
  const from = recipe ? toolUpgradeFrom(recipe) : null;
  const rows = Object.entries(cost).filter(([, amount]) => (amount ?? 0) > 0).map(([kind, amount]) => ({
    key: kind,
    name: ITEMS[kind as ResourceKind].name,
    owned: available[kind as ResourceKind] ?? 0,
    needed: (amount ?? 0) * Math.max(1, count),
  }));
  if (from && tools) rows.unshift({
    key: `tool-${from.tool}`, name: toolName(from.tool, from.tier),
    owned: tools[from.tool] >= from.tier ? 1 : 0, needed: 1,
  });
  return (
    <div style={{ display: 'grid', gap: 5, fontSize: 13 }}>
      {rows.map(({ key, name, owned, needed }) => {
        const missing = Math.max(0, needed - owned);
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'baseline', gap: 8, color: missing ? gameTheme.danger : gameTheme.muted }}>
            <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{name}</span>
            <span style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{owned} / {needed}</span>
            <span style={{ minWidth: 42, textAlign: 'right', whiteSpace: 'nowrap' }}>{missing ? `缺 ${missing}` : '✓ 齐全'}</span>
          </div>
        );
      })}
    </div>
  );
}
