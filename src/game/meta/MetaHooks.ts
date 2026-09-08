/** 局外养成注入各玩法系统的接口:Game 按单机/联机提供真实实现或空实现(联机不带加成) */

/** 采集「巧匠」三分支的注入接口 */
export type CollectMeta = {
  /** 拾穗/碎石成金/良种 的等级(0-3) */
  levels: { gleaning: number; rockWealth: number; seedline: number };
  /** 消费今天的「首次采集双倍」标记:今天首次且拾穗满 3 级时为真 */
  takeFirstCollect: () => boolean;
  /** 击碎陨石挖出珍宝(碎石成金满级):由外层抽珍宝并弹转盘 */
  meteorTreasure: () => void;
};

/** 钓鱼「渔父」三分支的注入接口 */
export type FishingMeta = {
  /** 省饵/不脱钩/满载 的等级(0-3) */
  levels: { baitSave: number; noSlip: number; fullLoad: number };
  /** 消费今天的免饵竿配额(省饵 1 级:每天前 2 竿) */
  takeFreeBaitCast: () => boolean;
  /** 消费今天的第一竿标记(满载 2 级:保底不出杂物) */
  takeFirstCast: () => boolean;
  /** 消费今天的自动咬钩标记(不脱钩 1 级:跳过点击直接中鱼) */
  takeAutoBite: () => boolean;
};

/** 联机/默认空实现:等级全 0,每日标记永远取不到 */
export const NO_COLLECT_META: CollectMeta = {
  levels: { gleaning: 0, rockWealth: 0, seedline: 0 },
  takeFirstCollect: () => false,
  meteorTreasure: () => {},
};

export const NO_FISHING_META: FishingMeta = {
  levels: { baitSave: 0, noSlip: 0, fullLoad: 0 },
  takeFreeBaitCast: () => false,
  takeFirstCast: () => false,
  takeAutoBite: () => false,
};
