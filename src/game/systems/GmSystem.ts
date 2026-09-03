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
}
