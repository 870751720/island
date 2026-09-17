'use client';

import { useId, type FC } from 'react';
import { HUSBANDRY_SVG } from './HusbandryIcons';
import { FOOD_SVG } from './FoodIcons';
import { REMAINING_FOOD_SVG } from './RemainingFoodIcons';
import { MATERIAL_SVG } from './MaterialIcons';
import { TOOL_SVG } from './ToolIcons';
import { FACILITY_SVG } from './FacilityIcons';
import { PROP_SVG } from './PropIcons';
import { EQUIPMENT_SVG } from './EquipmentIcons';
import type { ResourceKind } from '@/game/systems/Inventory';

/**
 * 黏土质感自绘图标统一注册:64×64 视口、软色块 + 暗部弧 + 高光 + 落影,
 * 覆盖全部道具分类，由 CustomIcons 导出统一注册表。
 * 原始 SVG 为静态字符串,经 dangerouslySetInnerHTML 注入,靠 viewBox 随容器缩放。
 */

type IconProps = { size: number };

export const CLAY_SVG: Partial<Record<ResourceKind, string>> = {
  ...FOOD_SVG,
  ...HUSBANDRY_SVG,
  ...REMAINING_FOOD_SVG,
  ...MATERIAL_SVG,
  ...TOOL_SVG,
  ...EQUIPMENT_SVG,
  ...FACILITY_SVG,
  ...PROP_SVG,
  shrimp: '<svg width="100%" height="100%" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="33" cy="56" rx="20" ry="3" fill="#49392718"/><g transform="translate(4 3) scale(.88)"><path d="M42 18 Q22 9 13 26 Q5 43 22 50 Q36 57 47 42 L40 35 Q34 46 25 40 Q19 37 22 30 Q26 24 36 28 L44 27Z" fill="#edac97" stroke="#b97466" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M39 37 L51 33 L54 43 L48 42 L48 51 L41 46 L37 43Z" fill="#b97466"/><path d="M15 28 Q22 14 37 20 L36 24 Q23 19 19 31Z" fill="#ffe0bf"/><path d="M18 25 L23 29 M13 34 L21 35 M16 43 L23 39 M25 49 L27 42 M35 47 L32 42" fill="none" stroke="#b97466" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M39 20 Q47 7 57 12 M41 23 Q53 16 58 23" fill="none" stroke="#b97466" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M31 28 L29 33 M35 29 L35 34" fill="none" stroke="#b97466" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="39" cy="23" rx="2.2" ry="2.2" fill="#393b34"/></g><ellipse cx="29" cy="29" rx="2.5" ry="1.5" fill="#ffe0bf"/></svg>',
  cuttlefish: '<svg width="100%" height="100%" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="33" cy="56" rx="20" ry="3" fill="#49392718"/><g transform="rotate(48 32 32) translate(2 1) scale(.94)"><path d="M29 9 Q14 8 11 20 Q7 25 12 30 Q6 36 15 40 L22 46 L43 43 Q54 40 50 33 Q57 26 50 21 Q48 9 35 9Z" fill="#976f8d"/><path d="M31 9 Q17 9 15 25 Q12 38 23 43 L41 43 Q50 36 47 24 Q44 8 31 9Z" fill="#d5b4c2"/><path d="M26 14 Q18 22 20 33 Q23 38 25 30 Q26 20 37 15 Q32 12 26 14Z" fill="#f4dce0"/><path d="M23 43 Q12 55 20 55 Q24 55 27 46 M28 45 Q23 58 29 56 L33 46 M36 46 Q36 59 41 55 L40 45 M43 42 Q55 53 47 54" fill="none" stroke="#976f8d" stroke-width="3.7" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="32" cy="41" rx="13" ry="7" fill="#d5b4c2"/><ellipse cx="25" cy="41" rx="4" ry="4" fill="#f4dce0"/><ellipse cx="40" cy="41" rx="4" ry="4" fill="#f4dce0"/><ellipse cx="26" cy="42" rx="2" ry="2" fill="#343d42"/><ellipse cx="39" cy="42" rx="2" ry="2" fill="#343d42"/></g></svg>',
};

function toClayIcon(svg: string): FC<IconProps> {
  return function ClayIcon({ size }: IconProps) {
    const instanceId = useId();
    // 同一食物可同时出现在背包、配方和提示中，裁剪引用必须按实例隔离。
    const markup = svg.replace(/(id="|url\(#)([^"\)]+)/g, (_, prefix: string, id: string) => `${prefix}${instanceId}-${id}`);
    return (
      <span
        aria-hidden="true"
        style={{ display: 'inline-flex', width: size, height: size, flex: 'none' }}
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    );
  };
}

/** 黏土风图标表:键为道具 kind,由 CustomIcons 合并进 CUSTOM_ICONS */
export const CLAY_ICONS: Partial<Record<ResourceKind, FC<IconProps>>> = Object.fromEntries(
  Object.entries(CLAY_SVG).map(([kind, svg]) => [kind, toClayIcon(svg as string)]),
) as Partial<Record<ResourceKind, FC<IconProps>>>;

/** 空手：圆润握拳，与道具图标使用同一黏土渲染方式。 */
export const HandIcon = toClayIcon(
  '<svg width="100%" height="100%" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="33" cy="56" rx="20" ry="3" fill="#49392718"/><path d="M20 51 L18 39 Q10 35 12 28 Q14 24 19 27 L19 20 Q19 14 24 15 Q27 9 32 14 Q38 10 41 16 Q47 14 48 22 L49 35 Q49 43 43 48 L43 53Z" fill="#dca478" stroke="#956346" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 28 Q26 23 31 30 L37 34 Q39 40 33 41 L24 37 L24 46" fill="#eeb88d"/><path d="M26 19 L26 25 M34 18 L34 26 M42 21 L42 29 M17 29 Q23 29 26 34" fill="none" stroke="#9e6747" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M23 48 L40 48" fill="none" stroke="#f9d4ae" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
);
