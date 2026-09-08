/** 局外养成「荒岛传承」:三分支九节点的静态定义(效果文案与消耗),存储与 UI 共用 */

export type MetaBranchId = 'gather' | 'fishing' | 'hunting';
export type MetaNodeId =
  | 'gleaning'
  | 'rockWealth'
  | 'seedline'
  | 'baitSave'
  | 'noSlip'
  | 'fullLoad'
  | 'plunder'
  | 'deadeye'
  | 'swordplay';

/** 各级升级消耗(下标 = 等级 - 1),标准档 30/60/120 */
export const META_COSTS = [30, 60, 120] as const;
export const META_MAX_LEVEL = 3;

export type MetaNodeDef = {
  id: MetaNodeId;
  name: string;
  /** 三级各自的效果文案(下标 = 等级 - 1) */
  levels: [string, string, string];
};

export type MetaBranchDef = {
  id: MetaBranchId;
  name: string;
  icon: string;
  motto: string;
  nodes: MetaNodeDef[];
};

export const META_TREE: MetaBranchDef[] = [
  {
    id: 'gather',
    name: '采集 · 巧匠',
    icon: '🌿',
    motto: '日复一日,双手记得每株草木的脾性。',
    nodes: [
      {
        id: 'gleaning',
        name: '拾穗',
        levels: [
          '采集草丛或灌木时,10% 额外拾得 1 份产出',
          '采摘果树时,10% 额外拾得 1 个果实',
          '每天第一次采集,收获必定双倍',
        ],
      },
      {
        id: 'rockWealth',
        name: '碎石成金',
        levels: [
          '凿岩石时,10% 额外敲下 1 块石头',
          '凿铁矿必定多出 1 块铁',
          '击碎陨石时,有 1% 的几率挖出珍宝',
        ],
      },
      {
        id: 'seedline',
        name: '良种',
        levels: [
          '伐木必定额外掉落 1 根木头',
          '伐木时,10% 额外掉落 1 颗种子',
          '伐木必定额外掉落 1 颗种子',
        ],
      },
    ],
  },
  {
    id: 'fishing',
    name: '钓鱼 · 渔父',
    icon: '🎣',
    motto: '浮漂起落之间,读懂整片海。',
    nodes: [
      {
        id: 'baitSave',
        name: '省饵',
        levels: [
          '每天前 2 竿不消耗鱼饵',
          '每竿 10% 不消耗鱼饵',
          '空手裸钓时,惩罚减轻',
        ],
      },
      {
        id: 'noSlip',
        name: '不脱钩',
        levels: [
          '每天第一次咬钩无需点击,直接中鱼',
          '大鱼的连点次数 -1',
          '珍宝的连点次数 -1',
        ],
      },
      {
        id: 'fullLoad',
        name: '满载',
        levels: [
          '起竿时 10% 渔获翻倍',
          '每天第一竿必定钓上鱼(不出杂物)',
          '稀世珍宝的出现几率提升',
        ],
      },
    ],
  },
  {
    id: 'hunting',
    name: '捕猎 · 猎手',
    icon: '🏹',
    motto: '山林寂静,因为你在其中。',
    nodes: [
      {
        id: 'plunder',
        name: '剥取',
        levels: [
          '击杀猎物时,10% 每种战利品额外 +1 份',
          '击杀狼或熊,额外掉落 1 块兽肉',
          '每天第一只猎物,战利品全部翻倍',
        ],
      },
      {
        id: 'deadeye',
        name: '神射',
        levels: [
          '射箭时 10% 不消耗箭矢',
          '每天前 3 支箭不消耗箭矢',
          '箭矢伤害提高 30%',
        ],
      },
      {
        id: 'swordplay',
        name: '剑术',
        levels: [
          '剑击时 10% 造成双倍伤害',
          '受到的伤害降低 10%',
          '熊的扑击减速,20% 几率闪身躲开',
        ],
      },
    ],
  },
];

/** 全树点满需要的传承点总数 */
export const META_FULL_COST = META_TREE.reduce(
  (sum, branch) => sum + branch.nodes.length * META_COSTS.reduce((a, b) => a + b, 0),
  0
);
