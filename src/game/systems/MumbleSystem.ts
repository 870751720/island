import type { DayPhase } from './DayNightSystem';
import type { Tools } from './Crafting';
import { MUMBLE_LINES, type MumbleTrigger } from '../dialogue/mumbleLines';
import { isWolfEventDay, isBearEventDay } from './DayEventSystem';

/** 每帧由 Game 汇总的触发条件快照 */
export type MumbleContext = {
  elapsed: number;
  dead: boolean;
  hunger: number;
  thirst: number;
  health: number;
  phase: DayPhase;
  day: number;
  rainIntensity: number;
  /** 大风强度(0~1),上穿阈值视为起风 */
  windIntensity: number;
  freeSlots: number;
  branch: number;
  stone: number;
  tools: Tools;
  collecting: boolean;
  /** 岛上已放置的设施数量(客人端由快照同步) */
  workbenchCount: number;
  smelterCount: number;
  loomCount: number;
  cookingCount: number;
  bedCount: number;
  /** 背包里是否有可烹饪的生食 */
  hasCookable: boolean;
  /** 背包里的漂流瓶数量 */
  bottle: number;
  /** 是否正有陨石坠落 */
  meteorActive: boolean;
};

/** 单条触发规则:按数组顺序即优先级,排在前面的先说 */
type TriggerRule = {
  id: MumbleTrigger;
  /** 该条件再次触发前需等待的秒数 */
  cooldown: number;
  /** 只触发一次(如开局引导) */
  once?: boolean;
  /** 每天最多触发一次(如狼之夜/熊之夜的铺垫台词),按 ctx.day 去重 */
  oncePerDay?: boolean;
  /** 边沿型(进入夜晚/开始下雨/起风/陨石坠落),只在状态跳变的那一帧命中 */
  edge?: boolean;
  test?: (ctx: MumbleContext) => boolean;
};

const TRIGGER_RULES: TriggerRule[] = [
  {
    // 天数事件「熊之夜」的白天铺垫(事件日当天最多说一句;判定与房主端结算共用同一份日程表)
    id: 'bearNight',
    cooldown: 0,
    oncePerDay: true,
    test: (c) => isBearEventDay(c.day) && c.phase === 'day',
  },
  {
    // 天数事件「狼之夜」的白天铺垫(第 10/20/30 天及之后每 10 天)
    id: 'wolfNight',
    cooldown: 0,
    oncePerDay: true,
    test: (c) => isWolfEventDay(c.day) && c.phase === 'day',
  },
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
  { id: 'nightFall', cooldown: 0, edge: true, test: (c) => c.phase === 'night' },
  { id: 'rainStart', cooldown: 0, edge: true, test: (c) => c.rainIntensity > 0.5 },
  { id: 'windRise', cooldown: 0, edge: true, test: (c) => c.windIntensity > 0.5 },
  { id: 'meteorFall', cooldown: 0, edge: true, test: (c) => c.meteorActive },
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
    // 中期发展:有镐子还没搭工作台(床/熔炉/纺织机等设施的前置)
    id: 'craftWorkbench',
    cooldown: 300,
    test: (c) => c.tools.pickaxe > 0 && c.workbenchCount === 0,
  },
  {
    // 中期发展:有工作台但还没建熔炉
    id: 'craftSmelter',
    cooldown: 300,
    test: (c) => c.workbenchCount > 0 && c.smelterCount === 0 && c.tools.pickaxe > 0,
  },
  {
    // 中期发展:有熔炉但斧/镐还没升到铁制(等级 3)
    id: 'ironTools',
    cooldown: 300,
    test: (c) => c.smelterCount > 0 && c.tools.axe < 3 && c.tools.pickaxe < 3,
  },
  {
    // 中期发展:有工作台但还没建纺织机(布料是装备/三级床的材料)
    id: 'craftLoom',
    cooldown: 300,
    test: (c) => c.workbenchCount > 0 && c.loomCount === 0 && c.tools.pickaxe > 0,
  },
  {
    // 中期发展:背包有生食但岛上没有烹饪台
    id: 'cookFood',
    cooldown: 300,
    test: (c) => c.hasCookable && c.cookingCount === 0,
  },
  {
    id: 'bottleHint',
    cooldown: 240,
    test: (c) => c.bottle > 0,
  },
  {
    // 夜晚行为:有床且夜里还醒着,引导回床睡觉跳过黑夜
    id: 'sleepHint',
    cooldown: 240,
    test: (c) => c.phase === 'night' && c.bedCount > 0 && !c.collecting,
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
  private firedDay = new Map<MumbleTrigger, number>();
  private sustainTimers = new Map<MumbleTrigger, number>();
  private edgePrev = new Map<MumbleTrigger, boolean>();
  private globalTimer = 0;

  constructor(private onMumble: (trigger: MumbleTrigger, text: string) => void) {}

  update(delta: number, ctx: MumbleContext): void {
    this.globalTimer += delta;
    this.cooldowns.forEach((t, id) => this.cooldowns.set(id, t - delta));

    if (ctx.dead || this.globalTimer < GLOBAL_INTERVAL) {
      this.sustainTimers.clear();
      // 冷却期里也要刷新边沿状态,避免短事件(如陨石)被漏检
      for (const rule of TRIGGER_RULES) {
        if (rule.edge) this.edgePrev.set(rule.id, rule.test!(ctx));
      }
      return;
    }

    for (const rule of TRIGGER_RULES) {
      if (rule.once && this.firedOnce.has(rule.id)) continue;
      if (rule.oncePerDay && this.firedDay.get(rule.id) === ctx.day) continue;
      if ((this.cooldowns.get(rule.id) ?? 0) > 0) {
        if (rule.edge) this.edgePrev.set(rule.id, rule.test!(ctx));
        continue;
      }

      // 边沿型只在状态从假跳到真的那一帧命中;电平型需持续满足 SUSTAIN 秒
      const active = rule.test!(ctx);
      let hit: boolean;
      if (rule.edge) {
        hit = active && this.edgePrev.get(rule.id) === false;
        this.edgePrev.set(rule.id, active);
      } else {
        hit = this.sustained(rule.id, active, delta);
      }
      if (!hit) continue;

      this.firedOnce.add(rule.id);
      if (rule.oncePerDay) this.firedDay.set(rule.id, ctx.day);
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
