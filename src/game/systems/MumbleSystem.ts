import type { DayPhase } from './DayNightSystem';
import type { Tools } from './Crafting';
import { MUMBLE_LINES, type MumbleTrigger } from '../dialogue/mumbleLines';

/** 每帧由 Game 汇总的触发条件快照 */
export type MumbleContext = {
  elapsed: number;
  dead: boolean;
  hunger: number;
  thirst: number;
  health: number;
  phase: DayPhase;
  rainIntensity: number;
  freeSlots: number;
  branch: number;
  stone: number;
  tools: Tools;
  collecting: boolean;
};

/** 单条触发规则:按数组顺序即优先级,排在前面的先说 */
type TriggerRule = {
  id: MumbleTrigger;
  /** 该条件再次触发前需等待的秒数 */
  cooldown: number;
  /** 只触发一次(如开局引导) */
  once?: boolean;
  /** 边沿型(进入夜晚/开始下雨),只在状态跳变的那一帧命中 */
  edge?: boolean;
  test?: (ctx: MumbleContext) => boolean;
};

const TRIGGER_RULES: TriggerRule[] = [
  {
    id: 'lowThirst',
    cooldown: 120,
    test: (c) => c.thirst < 30,
  },
  {
    id: 'lowHunger',
    cooldown: 120,
    test: (c) => c.hunger < 30,
  },
  {
    id: 'lowHealth',
    cooldown: 120,
    test: (c) => c.health < 30,
  },
  { id: 'nightFall', cooldown: 0, edge: true },
  { id: 'rainStart', cooldown: 0, edge: true },
  {
    id: 'bagFull',
    cooldown: 180,
    test: (c) => c.freeSlots <= 1,
  },
  {
    id: 'craftAxe',
    cooldown: 240,
    test: (c) => !c.tools.axe,
  },
  {
    id: 'chopWood',
    cooldown: 150,
    test: (c) => c.tools.axe > 0 && c.branch < 2 && !c.collecting,
  },
  {
    id: 'craftPickaxe',
    cooldown: 240,
    test: (c) => c.tools.axe > 0 && !c.tools.pickaxe,
  },
  {
    id: 'mineStone',
    cooldown: 150,
    test: (c) => c.tools.pickaxe > 0 && c.stone < 1 && !c.collecting,
  },
  {
    id: 'opening',
    cooldown: 0,
    once: true,
    test: (c) =>
      c.elapsed > 15 && c.branch === 0 && c.stone === 0 && !c.tools.axe && !c.tools.pickaxe,
  },
];

const GLOBAL_INTERVAL = 20; // 任意两句台词之间的最小间隔(开局第一句也在 20 秒左右出现)
const SUSTAIN = 2; // 电平型条件需持续满足的秒数,避免瞬时抖动误触发

/**
 * 自言自语系统:每帧检查触发条件,命中后从该条件的台词牌堆里抽一句,
 * 通过回调交给 UI 渲染。牌堆抽空后重新打乱,保证同一条件 20 句内不重复。
 */
export class MumbleSystem {
  private bags = new Map<MumbleTrigger, string[]>();
  private lastLine = new Map<MumbleTrigger, string>();
  private cooldowns = new Map<MumbleTrigger, number>();
  private firedOnce = new Set<MumbleTrigger>();
  private sustainTimers = new Map<MumbleTrigger, number>();
  private lastPhase: DayPhase = 'day';
  private wasRaining = false;
  private globalTimer = 0;

  constructor(private onMumble: (trigger: MumbleTrigger, text: string) => void) {}

  update(delta: number, ctx: MumbleContext): void {
    this.globalTimer += delta;
    this.cooldowns.forEach((t, id) => this.cooldowns.set(id, t - delta));

    const nightFall = ctx.phase === 'night' && this.lastPhase !== 'night';
    const rainStart = ctx.rainIntensity > 0.5 && !this.wasRaining;
    this.lastPhase = ctx.phase;
    this.wasRaining = ctx.rainIntensity > 0.5;

    if (ctx.dead || this.globalTimer < GLOBAL_INTERVAL) {
      this.sustainTimers.clear();
      return;
    }

    for (const rule of TRIGGER_RULES) {
      if (rule.once && this.firedOnce.has(rule.id)) continue;
      if ((this.cooldowns.get(rule.id) ?? 0) > 0) continue;

      // 边沿型只在状态跳变的那一帧命中;电平型需持续满足 SUSTAIN 秒
      const hit = rule.edge
        ? (rule.id === 'nightFall' ? nightFall : rainStart)
        : this.sustained(rule.id, rule.test!(ctx), delta);
      if (!hit) continue;

      this.firedOnce.add(rule.id);
      this.cooldowns.set(rule.id, rule.cooldown);
      this.globalTimer = 0;
      this.onMumble(rule.id, this.pick(rule.id));
      return; // 一帧最多说一句
    }
  }

  private sustained(id: MumbleTrigger, active: boolean, delta: number): boolean {
    if (!active) {
      this.sustainTimers.delete(id);
      return false;
    }
    const t = (this.sustainTimers.get(id) ?? 0) + delta;
    this.sustainTimers.set(id, t);
    return t >= SUSTAIN;
  }

  /** 从牌堆顶抽一句;抽空后重新打乱,且新堆末尾(下次先出)避开上次刚说过的那句 */
  private pick(id: MumbleTrigger): string {
    let bag = this.bags.get(id);
    if (!bag || bag.length === 0) {
      bag = [...MUMBLE_LINES[id]].sort(() => Math.random() - 0.5);
      const last = this.lastLine.get(id);
      if (last && bag.length > 1 && bag[bag.length - 1] === last) {
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      }
    }
    const line = bag.pop()!;
    this.bags.set(id, bag);
    this.lastLine.set(id, line);
    return line;
  }
}
