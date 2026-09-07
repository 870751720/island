/** 死因(最后一次造成伤害的来源) */
export type DeathCause = 'starve' | 'thirst' | 'drown' | 'animal';

/** 本局运行时累计的战绩计数(kills/collected 需要运行时累加,入档持久;其余死亡时现算) */
export type RunStats = { kills: number; collected: number };

/** 单机死亡的结算快照,供死亡界面与分享卡片展示 */
export type DeathReport = {
  day: number;
  cause: DeathCause;
  kills: number;
  collected: number;
  crafted: number;
  built: number;
  /** 死亡瞬间的场景截图(data URL,截图失败为 null) */
  scene: string | null;
};
