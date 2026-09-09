import type { HandTool } from '@/game/entities/Player';
import type { HudSnapshot } from '@/game/GameContracts';
import type { ResourceKind } from '@/game/systems/Inventory';
import { ITEMS } from '@/game/systems/Items';
import type { PickerItem } from './PlacePicker';
import { TOOL_ICONS, TOOL_LABELS } from './ToolButton';

const STANDARD_TOOLS = ['axe', 'pickaxe', 'shovel', 'hoe', 'fishingrod', 'bow', 'sword'] as const;

export interface PlacePickerItem extends PickerItem {
  tool?: HandTool;
  kind?: ResourceKind;
}

type PlacePickerSnapshot = Pick<
  HudSnapshot,
  'tool' | 'toolTiers' | 'hasLasso' | 'placeables' | 'heldItemKind'
>;

/** 按既有优先级生成手持项:空手、已拥有工具、套索、可放置道具。 */
export function createPlacePickerItems(hud: PlacePickerSnapshot): PlacePickerItem[] {
  return [
    {
      key: 'hand',
      icon: TOOL_ICONS.hand,
      name: TOOL_LABELS.hand!,
      tool: 'hand',
      active: hud.tool === 'hand',
    },
    ...STANDARD_TOOLS.filter((tool) => hud.toolTiers[tool] > 0).map((tool) => ({
      key: tool,
      icon: TOOL_ICONS[tool],
      name: TOOL_LABELS[tool]!,
      tool,
      active: hud.tool === tool,
    })),
    ...(hud.hasLasso
      ? [
          {
            key: 'lasso',
            icon: TOOL_ICONS.lasso,
            name: TOOL_LABELS.lasso!,
            tool: 'lasso' as const,
            active: hud.tool === 'lasso',
          },
        ]
      : []),
    ...hud.placeables.map(({ kind, count }) => ({
      key: kind,
      icon: ITEMS[kind].icon,
      name: ITEMS[kind].name,
      count,
      kind,
      active: hud.heldItemKind === kind,
    })),
  ];
}
