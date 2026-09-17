import type { Recipe, Tools } from '@/game/systems/Crafting';
import { toolName, toolUpgradeFrom } from '@/game/systems/Crafting';
import type { ResourceKind } from '@/game/systems/Inventory';
import { ITEMS } from '@/game/systems/Items';
import { gameTheme } from './gameTheme';
import { OverflowMarquee } from './OverflowMarquee';

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
  const details = rows.map((row) => ({ ...row, missing: Math.max(0, row.needed - row.owned) }));
  // 缺口排在前面，打开面板即可先看到采集目标。
  details.sort((a, b) => Number(b.missing > 0) - Number(a.missing > 0));
  const label = details.map(({ name, owned, needed, missing }) =>
    `${name} ${owned}/${needed}${missing ? ` 缺${missing}` : ' ✓'}`).join(' · ');
  return (
    <div style={{ fontSize: 12, color: gameTheme.muted, fontVariantNumeric: 'tabular-nums' }}>
      <OverflowMarquee label={label}>
        {details.map(({ key, name, owned, needed, missing }, index) => (
          <span key={key}>
            {index > 0 && <span style={{ color: gameTheme.muted, opacity: 0.55 }}> · </span>}
            <span style={{ color: missing ? gameTheme.danger : gameTheme.muted }}>
              {name} {owned}/{needed}{missing ? <strong style={{ fontWeight: 600 }}> 缺{missing}</strong> : ' ✓'}
            </span>
          </span>
        ))}
      </OverflowMarquee>
    </div>
  );
}
