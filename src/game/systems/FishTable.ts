import type { ResourceKind } from './Inventory';
import { GmSystem } from './GmSystem';

/** 钓鱼档位:1 杂物 / 2 普通鱼 / 3 大鱼 / 4 稀世珍宝 */
export type FishTier = 1 | 2 | 3 | 4;

/** 一条可钓起的战利品:背包道具 + 上钩挣扎的体型与配色 */
export type LootEntry = {
  kind: ResourceKind;
  /** 档内权重(非概率) */
  weight: number;
  /** 拉出水面时的体型缩放 */
  size: number;
  /** 挣扎/粒子/掉落模型的主色 */
  color: string;
  /** 造型:普通鱼 / 细长 / 扁宽 / 杂物块 / 罐子 / 瓶子 / 卷纸 / 鱼钩 */
  shape: 'fish' | 'long' | 'flat' | 'junk' | 'can' | 'bottle';
};

/** 各档位的战利品池 */
export const TIER_LOOT: Record<FishTier, LootEntry[]> = {
  1: [
    { kind: 'wood', weight: 4, size: 0.8, color: '#8a6239', shape: 'junk' },
    { kind: 'fiber', weight: 4, size: 0.7, color: '#7cb36a', shape: 'junk' },
    { kind: 'stone', weight: 4, size: 0.8, color: '#9a9a9a', shape: 'junk' },
    { kind: 'cola', weight: 2, size: 0.7, color: '#c0392b', shape: 'can' },
    { kind: 'colaZero', weight: 2, size: 0.7, color: '#2c3e50', shape: 'can' },
    { kind: 'bottle', weight: 1, size: 0.8, color: '#a8d4d6', shape: 'bottle' },
  ],
  2: [
    { kind: 'sardine', weight: 4, size: 0.85, color: '#b8cdd9', shape: 'fish' },
    { kind: 'perch', weight: 3, size: 1.0, color: '#8fa87b', shape: 'fish' },
    { kind: 'shrimp', weight: 3, size: 0.8, color: '#e8927c', shape: 'fish' },
    { kind: 'loach', weight: 3, size: 1.0, color: '#8a7a4a', shape: 'long' },
    { kind: 'puffer', weight: 2, size: 1.05, color: '#d9c15a', shape: 'fish' },
    { kind: 'cuttlefish', weight: 2, size: 1.0, color: '#6b5f8a', shape: 'flat' },
    { kind: 'crabMeat', weight: 2, size: 0.9, color: '#e2793a', shape: 'flat' },
  ],
  3: [
    { kind: 'grouper', weight: 3, size: 1.5, color: '#6d7b5a', shape: 'fish' },
    { kind: 'catfish', weight: 3, size: 1.6, color: '#5b664f', shape: 'long' },
    { kind: 'swordfish', weight: 2, size: 1.7, color: '#5a7d9e', shape: 'long' },
    { kind: 'manta', weight: 2, size: 1.7, color: '#4a5568', shape: 'flat' },
  ],
  4: [{ kind: 'goldenFish', weight: 2, size: 1.3, color: '#e6b422', shape: 'fish' }],
};

/** 各档位的咬钩交互:反应窗口秒数与所需点击次数 */
export const TIER_BITE: Record<FishTier, { window: number; clicks: number }> = {
  1: { window: 1.3, clicks: 1 },
  2: { window: 1.3, clicks: 1 },
  3: { window: 2.5, clicks: 5 },
  4: { window: 3.2, clicks: 7 },
};

/** 各档位等待时长范围(秒);高档位保证有预告时间 */
const TIER_WAIT: Record<FishTier, [number, number]> = {
  1: [4, 9],
  2: [6, 10],
  3: [7, 11],
  4: [7, 11],
};

/** 白色预告:咬钩前 4.5 秒,暗示不是杂物(档位 ≥2 时出现) */
const TEASE_WHITE = [
  '竿梢好像轻轻点了一下…',
  '水下的动静不太寻常…',
  '这手感…好像不是树枝?',
  '钓线绷得有点微妙…',
  '浮漂周围的涟漪变大了…',
  '有什么东西在试探鱼饵…',
  '手腕传来一阵细微的颤动…',
  '水下隐约有道黑影游过…',
  '竿身弯出了一点点弧度…',
  '这拉力,不太像小杂鱼…',
  '浮漂下沉得有点犹豫…',
  '水花溅起的方向很奇怪…',
  '指尖感觉到生命在挣扎…',
  '钓线在水里划出了细纹…',
  '好像钓到了个沉甸甸的家伙…',
  '浮漂晃动的节奏变了…',
  '远方的水鸟突然安静了…',
  '这一竿,感觉有戏…',
  '竿梢的颤动越来越清晰…',
  '水下传来一声闷响…',
];

/** 紫色预告:咬钩前 3 秒,暗示是大物(档位 ≥3 时出现) */
const TEASE_PURPLE = [
  '水下的家伙力气很大…',
  '钓线被拽得笔直…',
  '竿身弯得厉害,撑住!',
  '这绝不是一条普通的鱼…',
  '水面下翻起了巨大的暗涌…',
  '双手都能感到那股蛮力…',
  '线轴发出吱吱的响声…',
  '那个黑影,比想象中大得多…',
  '整片水域都在为之震动…',
  '心跳开始加速了…',
  '这股拉力来自深处…',
  '竿子几乎要脱手了…',
];

/** 金色预告:咬钩前 1.5 秒,确定是大鱼(仅三档出现;四档不预告) */
const TEASE_GOLD = [
  '水中闪过一道巨大的鳞光!',
  '那个身影庞大得惊人!',
  '水面炸开了金色的浪花!',
  '大鱼露出了它的背鳍!',
  '整片水域都在沸腾!',
  '这就是传说中的大物!',
  '竿梢指向了水下的巨影!',
  '最后时刻,它加速了!',
];

/** 档位预告文字与颜色 */
export type Tease = { text: string; color: string };

/** 预告阶段:白色(≥2 档)/紫色(≥3 档)/金色(仅 3 档);四档无预告 */
export type TeaseStage = 'white' | 'purple' | 'gold';

/**
 * 按档位时间轴取当前预告阶段。
 * 相对咬钩时刻:白色 -4.5s,紫色 -3s,金色 -1.5s。
 * 文案抽样由调用方在阶段切换时做一次并缓存,避免每帧换句。
 */
export function teaseStage(tier: FishTier, secondsToBite: number): TeaseStage | null {
  if (tier >= 2 && secondsToBite <= 4.5 && secondsToBite > 3) return 'white';
  if (tier >= 3 && secondsToBite <= 3 && secondsToBite > 1.5) return 'purple';
  if (tier === 3 && secondsToBite <= 1.5 && secondsToBite > 0) return 'gold';
  return null;
}

const TEASE_POOL: Record<TeaseStage, string[]> = {
  white: TEASE_WHITE,
  purple: TEASE_PURPLE,
  gold: TEASE_GOLD,
};

const TEASE_COLOR: Record<TeaseStage, string> = {
  white: '#ffffff',
  purple: '#c39bd3',
  gold: '#f7d774',
};

/** 抽一条预告(阶段切换时调用一次) */
export function pickTease(stage: TeaseStage): Tease {
  const pool = TEASE_POOL[stage];
  return { text: pool[Math.floor(Math.random() * pool.length)], color: TEASE_COLOR[stage] };
}

/** 按 GM 权重随机档位 */
export function rollTier(): FishTier {
  const w = GmSystem.fishingTierWeights;
  const total = w[0] + w[1] + w[2] + w[3];
  if (total <= 0) return 1;
  let r = Math.random() * total;
  for (let i = 0; i < 4; i++) {
    if (r < w[i]) return (i + 1) as FishTier;
    r -= w[i];
  }
  return 4;
}

/** 按档内权重随机战利品 */
export function rollLoot(tier: FishTier): LootEntry {
  const pool = TIER_LOOT[tier];
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of pool) {
    if (r < e.weight) return e;
    r -= e.weight;
  }
  return pool[pool.length - 1];
}

/** 按档位抽等待时长(秒) */
export function rollWait(tier: FishTier): number {
  const [min, max] = TIER_WAIT[tier];
  return min + Math.random() * (max - min);
}
