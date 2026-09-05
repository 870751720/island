/** GM 调试开关:运行时内存态,不入存档,新对局重置为默认值 */
export const GmSystem = {
  /** 是否允许死亡;关闭后生命耗尽也不会死 */
  allowDeath: true,
  /** 无敌模式:饥饿/口渴不掉、生命与体力回满 */
  godMode: false,
  /** 是否锁定白天;开启后时间停止在正午(与锁定夜晚互斥) */
  lockDaytime: false,
  /** 是否锁定夜晚;开启后时间停止在午夜(与锁定白天互斥) */
  lockNighttime: false,
  /** 风表现三态:auto=晴天按概率自然起风,on=强制有风,off=强制无风 */
  wind: 'auto' as 'auto' | 'on' | 'off',
  /** 钓鱼四档概率权重(杂物/普通鱼/大鱼/珍宝),按权重归一抽取 */
  fishingTierWeights: [45, 40, 12, 3],
  /** 是否显示帧率浮层(FpsOverlay 轮询此标记) */
  showFps: false,
  /** 是否显示网络流量浮层(TrafficOverlay 轮询此标记,仅本机显示) */
  showTraffic: false,
  /** 是否显示实际水体判定覆盖层：洋红=海水，亮绿=水洼 */
  showWaterDebug: false,
  /** 玩家攻击力倍率(作用于剑与弓箭对生物的伤害结算) */
  attackMultiplier: 1,
  /** 玩家移动速度倍率(赶路调试用,1 为正常) */
  speedMultiplier: 1,
  /** 喝水触发鳄鱼袭击的概率(0~1,特殊事件调试用) */
  crocodileChance: 0.02,
};

/** GM 配置快照类型:联机时全房间同步这一份 */
export type GmConfig = typeof GmSystem;

/** 读取当前 GM 配置快照 */
export function gmSnapshot(): GmConfig {
  return {
    allowDeath: GmSystem.allowDeath,
    godMode: GmSystem.godMode,
    lockDaytime: GmSystem.lockDaytime,
    lockNighttime: GmSystem.lockNighttime,
    wind: GmSystem.wind,
    fishingTierWeights: [...GmSystem.fishingTierWeights],
    showFps: GmSystem.showFps,
    showTraffic: GmSystem.showTraffic,
    showWaterDebug: GmSystem.showWaterDebug,
    attackMultiplier: GmSystem.attackMultiplier,
    speedMultiplier: GmSystem.speedMultiplier,
    crocodileChance: GmSystem.crocodileChance,
  };
}

/** 按 snapshot 覆盖 GM 配置(字段级校验,非法值忽略) */
export function gmApply(config: Partial<GmConfig>): void {
  if (typeof config.allowDeath === 'boolean') GmSystem.allowDeath = config.allowDeath;
  if (typeof config.godMode === 'boolean') GmSystem.godMode = config.godMode;
  if (typeof config.lockDaytime === 'boolean') GmSystem.lockDaytime = config.lockDaytime;
  if (typeof config.lockNighttime === 'boolean') GmSystem.lockNighttime = config.lockNighttime;
  // 锁白天/锁夜晚互斥:后设置者生效,另一个自动解除
  if (GmSystem.lockDaytime && GmSystem.lockNighttime) {
    if (config.lockDaytime) GmSystem.lockNighttime = false;
    else GmSystem.lockDaytime = false;
  }
  if (config.wind === 'auto' || config.wind === 'on' || config.wind === 'off') GmSystem.wind = config.wind;
  if (Array.isArray(config.fishingTierWeights) && config.fishingTierWeights.length === 4
    && config.fishingTierWeights.every((w) => Number.isFinite(w) && w >= 0)) {
    GmSystem.fishingTierWeights = [...config.fishingTierWeights] as GmConfig['fishingTierWeights'];
  }
  if (typeof config.showFps === 'boolean') GmSystem.showFps = config.showFps;
  if (typeof config.showTraffic === 'boolean') GmSystem.showTraffic = config.showTraffic;
  if (typeof config.showWaterDebug === 'boolean') GmSystem.showWaterDebug = config.showWaterDebug;
  if (typeof config.attackMultiplier === 'number' && Number.isFinite(config.attackMultiplier)) {
    GmSystem.attackMultiplier = Math.min(1000, Math.max(0.1, config.attackMultiplier));
  }
  if (typeof config.speedMultiplier === 'number' && Number.isFinite(config.speedMultiplier)) {
    GmSystem.speedMultiplier = Math.min(10, Math.max(0.1, config.speedMultiplier));
  }
  if (typeof config.crocodileChance === 'number' && Number.isFinite(config.crocodileChance)) {
    GmSystem.crocodileChance = Math.min(1, Math.max(0, config.crocodileChance));
  }
}
