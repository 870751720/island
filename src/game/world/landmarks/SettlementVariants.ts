import type { LandmarkKind } from './LandmarkDefinitions';
import type { VariantPlan } from './LandmarkVariants';

export const SETTLEMENT_VARIANTS: Partial<Record<LandmarkKind, readonly [VariantPlan, VariantPlan]>> = {
  camp: [
    {
      name: "双翼歇脚地",
      positions: {"bed": [[0, -3, 1.5708]], "fire": [[0, 0]], "crate": [[3, -2]], "torch": [[-3, 2]]},
      walls: [[-4, -3, 0, 1, 5], [4, 0, 0, 1, 4]],
    },
    {
      name: "折角宿营地",
      positions: {"bed": [[-2, 1]], "fire": [[1, -2]], "crate": [[2, 2]], "torch": [[3, -4]]},
      walls: [[-4, -1, 0, 1, 5], [-3, 4, 1, 0, 6], [0, -4, 1, 0, 3]],
    },
  ],
  fishing: [
    {
      name: "双岸渔作院",
      positions: {"bed": [[0, -3]], "bait": [[-3, 0]], "fire": [[0, 2]], "crate": [[3, 0]], "torch": [[3, 3]]},
      walls: [[-5, -2, 0, 1, 6], [5, -2, 0, 1, 6]],
    },
    {
      name: "折湾鱼饵站",
      positions: {"bed": [[-3, 1]], "bait": [[0, -3]], "fire": [[0, 1]], "crate": [[3, -3]], "torch": [[3, 2]]},
      walls: [[-5, -1, 0, 1, 5], [-4, -5, 1, 0, 9], [4, -4, 0, 1, 3]],
    },
  ],
  farm: [
    {
      name: "中央田岛",
      positions: {"bed": [[-3, -3]], "fire": [[-3, 1]], "crate": [[3, 3]], "torch": [[0, 4]]},
      walls: [[-5, -5, 1, 0, 9], [-5, -4, 0, 1, 8], [5, -2, 0, 1, 5]],
      plots: [[0, -2, 2, 3], [3, -2, 2, 3]],
    },
    {
      name: "前圃后舍",
      positions: {"bed": [[0, -3, 1.5708]], "fire": [[3, -2]], "crate": [[-3, -2]], "torch": [[0, 4]]},
      walls: [[-4, -5, 1, 0, 9], [-5, 0, 0, 1, 4], [5, 0, 0, 1, 4]],
      plots: [[-4, 1, 3, 2], [2, 1, 3, 2]],
    },
  ],
  hunter: [
    {
      name: "箭头哨营",
      positions: {"bed": [[0, -3, 1.5708]], "fire": [[0, 0]], "crate": [[3, -2]], "torch": [[-2, 3]]},
      walls: [[-4, -3, 0, 1, 4], [4, -1, 0, 1, 3], [-3, 2, 0, 1, 2], [3, 3, 0, 1, 2]],
    },
    {
      name: "双屏猎营",
      positions: {"bed": [[-3, -2]], "fire": [[0, 1]], "crate": [[3, -1]], "torch": [[3, 3]]},
      walls: [[-5, -4, 1, 0, 6], [2, -3, 1, 0, 3], [-4, 3, 1, 0, 4], [5, -1, 0, 1, 6]],
    },
  ],
  workshop: [
    {
      name: "双台作坊",
      positions: {"bed": [[0, 3]], "bench": [[-3, -1]], "smelter": [[3, -1]], "loom": [[3, -1]], "crate": [[0, -3]], "fire": [[-3, 2]], "torch": [[3, 3]]},
      walls: [[-5, -3, 0, 1, 6, true], [5, -3, 0, 1, 6, true], [-2, -5, 1, 0, 5, true]],
    },
    {
      name: "前店后帐",
      positions: {"bed": [[-3, -3]], "bench": [[-2, 1]], "smelter": [[2, 1]], "loom": [[2, 1]], "crate": [[3, -3]], "fire": [[0, -2]], "torch": [[0, 4]]},
      walls: [[-5, -5, 1, 0, 11, true], [-5, -4, 0, 1, 3, true], [5, -4, 0, 1, 3, true], [-4, 3, 1, 0, 2, true], [3, 3, 1, 0, 2, true]],
    },
  ],
  brewery: [
    {
      name: "酒桶中庭",
      positions: {"bed": [[-3, -2]], "brew": [[0, 0]], "fire": [[-2, 2]], "crate": [[0, -3]], "torch": [[3, 3]]},
      walls: [[-5, -4, 1, 0, 6], [-5, -3, 0, 1, 7], [5, -3, 0, 1, 7]],
      plots: [[3, -2, 2, 3]],
    },
    {
      name: "横垄酿坊",
      positions: {"bed": [[3, -3]], "brew": [[-3, -2]], "fire": [[0, -1]], "crate": [[-3, 1]], "torch": [[3, 3]]},
      walls: [[-5, -4, 0, 1, 7], [-4, 4, 1, 0, 6], [5, -4, 0, 1, 6]],
      plots: [[0, 2, 3, 2]],
    },
  ],
  village: [
    {
      name: "环火集落",
      positions: {"bed": [[0, -5, 1.5708]], "bench": [[-4, -3]], "loom": [[-5, 0]], "fire": [[0, 0]], "brew": [[-4, 3]], "bait": [[4, -2]], "crate": [[-2, -2], [5, 1]], "torch": [[-1, 4], [2, -3]]},
      walls: [[-6, -4, 0, 1, 3], [-6, 2, 0, 1, 3], [-4, 6, 1, 0, 4], [6, -3, 0, 1, 3]],
      plots: [[1, 4, 2, 3], [4, 4, 2, 3]],
    },
    {
      name: "一街两坊",
      positions: {"bed": [[-4, -4]], "bench": [[-4, 0]], "loom": [[-4, 3]], "fire": [[0, 0]], "brew": [[4, -4]], "bait": [[4, -1]], "crate": [[-1, -4], [1, 3]], "torch": [[0, -6], [-1, 5]]},
      walls: [[-6, -5, 0, 1, 11], [6, -5, 0, 1, 4], [6, 2, 0, 1, 6], [-5, 6, 1, 0, 3]],
      plots: [[3, 3, 3, 2], [3, 6, 3, 2]],
    },
  ],
};
