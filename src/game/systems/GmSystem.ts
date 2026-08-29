/** GM 调试开关:运行时内存态,不入存档,新对局重置为默认值 */
export const GmSystem = {
  /** 是否允许死亡;关闭后生命耗尽也不会死 */
  allowDeath: true,
  /** 无敌模式:饥饿/口渴不掉、生命与体力回满 */
  godMode: false,
  /** 是否锁定白天;开启后时间停止在正午 */
  lockDaytime: false,
  /** 风表现三态:auto=晴天按概率自然起风,on=强制有风,off=强制无风 */
  wind: 'auto' as 'auto' | 'on' | 'off',
  /** 钓鱼四档概率权重(杂物/普通鱼/大鱼/珍宝),按权重归一抽取 */
  fishingTierWeights: [45, 40, 12, 3],
};
