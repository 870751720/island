import type { LandmarkKind } from './LandmarkDefinitions';
import type { VariantPlan } from './LandmarkVariants';

export const RUIN_VARIANTS: Partial<Record<LandmarkKind, readonly [VariantPlan, VariantPlan]>> = {
  seaRuin: [
    {
      name: "潮汐双湾",
      positions: {"shrine": [[0, -3]], "torch": [[-2, 1], [2, 1]], "crate": [[0, 3]]},
      walls: [[-5, -3, 0, 1, 6, true], [-4, -4, 1, 0, 2, true], [3, -4, 1, 0, 2, true], [5, -3, 0, 1, 6, true], [-4, 3, 1, 0, 2, true], [3, 3, 1, 0, 2, true]],
    },
    {
      name: "断堤祭台",
      positions: {"shrine": [[-2, -2]], "torch": [[-2, 1], [2, -2]], "crate": [[3, 2]]},
      walls: [[-4, -4, 1, 0, 8, true], [-4, -3, 0, 1, 7, true], [-3, 4, 1, 0, 4, true], [2, 4, 1, 0, 3, true], [5, 0, 0, 1, 3, true]],
    },
  ],
  harvestRuin: [
    {
      name: "四季田岛",
      positions: {"shrine": [[0, 0]], "torch": [[-1, 3], [1, 3]], "crate": [[0, -3]]},
      walls: [[-5, -5, 1, 0, 4, true], [2, -5, 1, 0, 4, true], [-5, 2, 0, 1, 3], [5, 2, 0, 1, 3]],
      plots: [[-4, -4, 2, 4], [3, -4, 2, 4], [-4, 2, 2, 2], [3, 2, 2, 2]],
    },
    {
      name: "梯田圣径",
      positions: {"shrine": [[0, -4]], "torch": [[-1, 1], [1, 1]], "crate": [[3, -4]]},
      walls: [[-2, -6, 1, 0, 5, true], [-5, -3, 0, 1, 4, true], [5, 1, 0, 1, 4]],
      plots: [[-4, -2, 4, 2], [1, 2, 4, 2], [-4, 3, 2, 2], [2, -2, 2, 2]],
    },
  ],
  healingRuin: [
    {
      name: "月牙静院",
      positions: {"shrine": [[-1, 0]], "torch": [[-2, -2], [-2, 2]], "crate": [[2, -2]]},
      walls: [[-4, -2, 0, 1, 5, true], [-3, -3, 1, 0, 2, true], [-3, 3, 1, 0, 2, true], [0, -4, 1, 0, 3, true], [0, 4, 1, 0, 3, true]],
    },
    {
      name: "双环水晶径",
      positions: {"shrine": [[0, -2]], "torch": [[-2, 0], [2, 0]], "crate": [[0, 3]]},
      walls: [[-2, -4, 1, 0, 5, true], [-4, -2, 0, 1, 3, true], [4, -2, 0, 1, 3, true], [-3, 2, 0, 1, 3, true], [3, 2, 0, 1, 3, true], [-2, 5, 1, 0, 2, true], [1, 5, 1, 0, 2, true]],
    },
  ],
  rainRuin: [
    {
      name: "十字祈雨庭",
      positions: {"shrine": [[0, 0]], "torch": [[-2, 2], [2, -2]], "crate": [[3, 3]]},
      walls: [[-4, -4, 1, 0, 3, true], [2, -4, 1, 0, 3, true], [-4, -3, 0, 1, 2, true], [4, -3, 0, 1, 2, true], [-4, 2, 0, 1, 3, true], [4, 2, 0, 1, 3, true], [-3, 4, 1, 0, 2, true], [2, 4, 1, 0, 2, true]],
    },
    {
      name: "偏轴雨廊",
      positions: {"shrine": [[2, -3]], "torch": [[0, -1], [-2, 3]], "crate": [[3, 0]]},
      walls: [[0, -5, 1, 0, 5, true], [5, -4, 0, 1, 6, true], [-2, -3, 0, 1, 4, true], [-4, 0, 0, 1, 6, true], [-3, 5, 1, 0, 5, true]],
    },
  ],
  incenseRuin: [
    {
      name: "折门守望台",
      positions: {"shrine": [[-2, -2]], "torch": [[-1, 1], [3, 2]], "crate": [[2, -2]]},
      walls: [[-4, -4, 1, 0, 8, true], [-4, -3, 0, 1, 4, true], [-5, 2, 1, 0, 4], [1, 4, 1, 0, 5], [5, -2, 0, 1, 6]],
    },
    {
      name: "三面拒兽堡",
      positions: {"shrine": [[0, -2]], "torch": [[-2, 1], [2, 1]], "crate": [[0, 2]]},
      walls: [[-3, -4, 1, 0, 7, true], [-4, -2, 0, 1, 6], [4, -2, 0, 1, 6], [-3, 4, 1, 0, 2], [2, 4, 1, 0, 2]],
      gates: [[-1, 4]],
    },
  ],
};
