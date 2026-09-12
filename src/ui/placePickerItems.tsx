import type { ReactNode } from 'react';
import type { HandTool } from '@/game/entities/Player';
import type { HudSnapshot } from '@/game/GameContracts';
import type { ResourceKind } from '@/game/systems/Inventory';
import { ITEMS } from '@/game/systems/Items';
import type { PickerItem } from './PlacePicker';
import { TOOL_LABELS } from './ToolButton';
import { ItemIcon, ToolIcon } from './ItemIcon';

const STANDARD_TOOLS = ['axe', 'pickaxe', 'shovel', 'hoe', 'fishingrod', 'bow', 'sword'] as const;

export interface PlacePickerItem extends PickerItem {
  tool?: HandTool;
  kind?: ResourceKind;
}

type PlacePickerSnapshot = Pick<
  HudSnapshot,
  'tool' | 'toolTiers' | 'hasLasso' | 'placeables' | 'heldItemKind'
>;

/** 按既有优先级生成手持项:空手、已拥有工具、套索、可放置道具;图标统一走 ItemIcon/ToolIcon,与背包一致。 */
export function createPlacePickerItems(hud: PlacePickerSnapshot): PlacePickerItem[] {
  const toolIcon = (tool: HandTool): ReactNode => <ToolIcon tool={tool} size={26} />;
  return [
    {
      key: 'hand',
      icon: toolIcon('hand'),
      name: TOOL_LABELS.hand!,
      tool: 'hand',
      active: hud.tool === 'hand',
    },
    ...STANDARD_TOOLS.filter((tool) => hud.toolTiers[tool] > 0).map((tool) => ({
      key: tool,
      icon: toolIcon(tool),
      name: TOOL_LABELS[tool]!,
      tool,
      active: hud.tool === tool,
    })),
    ...(hud.hasLasso
      ? [
          {
            key: 'lasso',
            icon: toolIcon('lasso'),
            name: TOOL_LABELS.lasso!,
            tool: 'lasso' as const,
            active: hud.tool === 'lasso',
          },
        ]
      : []),
    ...hud.placeables.map(({ kind, count }) => ({
      key: kind,
      icon: <ItemIcon kind={kind} size={26} />,
      name: ITEMS[kind].name,
      count,
      kind,
      active: hud.heldItemKind === kind,
    })),
  ];
}
