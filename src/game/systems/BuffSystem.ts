/** Buff 的静态定义与快照结构。
 * 生效判定不在这里:各 buff 由对应系统(神像/玩家减速)驱动,这里只承载
 * 展示用的名称、图标与说明,以及 HUD 快照的序列化结构。 */
export type BuffId = 'poseidon' | 'bearSlow';

export type BuffDef = {
  id: BuffId;
  name: string;
  icon: string;
  description: string;
  /** 增益/减益:决定图标描边颜色 */
  good: boolean;
};

export const BUFFS: Record<BuffId, BuffDef> = {
  poseidon: {
    id: 'poseidon',
    name: '波塞冬的祝福',
    icon: '🔱',
    description: '岛上放置着波塞冬的祝福,全岛钓鱼钓到杂物的概率降低 1%。',
    good: true,
  },
  bearSlow: {
    id: 'bearSlow',
    name: '熊扑压制',
    icon: '🐌',
    description: '被熊扑中摔得爬不起来,移动速度减半,持续 3 秒。',
    good: false,
  },
};

/** HUD 快照里的一条 buff;remain 为剩余秒数,永久/非限时 buff 为 null */
export type HudBuff = BuffDef & { remain: number | null };
