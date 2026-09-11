/** Buff 的静态定义与快照结构。
 * 生效判定不在这里:各 buff 由对应系统(神像/玩家减速)驱动,这里只承载
 * 展示用的名称、图标与说明,以及 HUD 快照的序列化结构。 */
export type BuffId =
  | 'poseidon'
  | 'beehive'
  | 'healCrystal'
  | 'rainAltar'
  | 'rainBlessing'
  | 'windBlessing'
  | 'snowBlessing'
  | 'bearSlow'
  | 'refresh'
  | 'tipsy';

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
  beehive: {
    id: 'beehive',
    name: '蜂巢神龛',
    icon: '🍯',
    description: '岛上放置着蜂巢神龛,全岛采集浆果丛时有 10% 概率多掉 1 颗浆果。',
    good: true,
  },
  healCrystal: {
    id: 'healCrystal',
    name: '治愈水晶',
    icon: '💗',
    description: '身处治愈水晶 30 米光环内,每 10 秒回复 1 点生命。',
    good: true,
  },
  rainAltar: {
    id: 'rainAltar',
    name: '雨神祭坛',
    icon: '🌧️',
    description: '身处雨神祭坛 30 米光环内,口渴值不再下降。',
    good: true,
  },
  rainBlessing: {
    id: 'rainBlessing',
    name: '雨水恩泽',
    icon: '🌧️',
    description: '细雨润物,雨水正滋养着你与这座岛。',
    good: true,
  },
  windBlessing: {
    id: 'windBlessing',
    name: '风之加护',
    icon: '🌬️',
    description: '风推着你的脚步,吹得草木慷慨,连兔子都兴奋得忘了躲进洞里。',
    good: true,
  },
  snowBlessing: {
    id: 'snowBlessing',
    name: '雪之馈赠',
    icon: '🌨️',
    description: '寒意让你身心沉静,冰雪之下的鱼儿肥美、走兽皮毛厚实。',
    good: true,
  },
  bearSlow: {
    id: 'bearSlow',
    name: '熊扑压制',
    icon: '🐌',
    description: '被熊扑中摔得爬不起来,移动速度减半,持续 3 秒。',
    good: false,
  },
  refresh: {
    id: 'refresh',
    name: '舒爽',
    icon: '🍸',
    description: '喝下一瓶酒,浑身舒爽,移动速度提升 30%。',
    good: true,
  },
  tipsy: {
    id: 'tipsy',
    name: '晕晕的',
    icon: '😵',
    description: '舒爽时又灌了一口,走起路来晕乎乎:移动速度降低 10%,但攻击力提升 30%。',
    good: true,
  },
};

/** HUD 快照里的一条 buff;remain 为剩余秒数,永久/非限时 buff 为 null */
export type HudBuff = BuffDef & { remain: number | null };
