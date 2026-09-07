import type { DayNightSystem } from './DayNightSystem';
import type { Wildlife } from '../entities/Wildlife';
import type { PlayerSession } from '../mp/PlayerSession';

/** 第 10 天:每名玩家 1 头绑定狼 */
const FIRST_WOLF_DAY = 10;
/** 第 20 / 30 天:每名玩家各 2 头绑定狼 */
const PACK_WOLF_DAYS = [20, 30];
/** 第 30 天之后,每过 10 天:每名玩家 2-5 头绑定狼 */
const LATE_WOLF_START = 30;
const LATE_WOLF_EVERY = 10;
/** 第 30 天之后,每过 25 天:全房间随机 1-2 头熊(不按玩家数翻倍) */
const BEAR_START = 30;
const BEAR_EVERY = 25;

/** 某天是否为「狼之夜」事件日(当晚每名玩家会刷绑定狼);台词与结算共用同一判定 */
export function isWolfEventDay(day: number): boolean {
  return day === FIRST_WOLF_DAY || PACK_WOLF_DAYS.includes(day)
    || (day > LATE_WOLF_START && (day - LATE_WOLF_START) % LATE_WOLF_EVERY === 0);
}

/** 某天是否为「熊之夜」事件日(当晚全房间刷熊);台词与结算共用同一判定 */
export function isBearEventDay(day: number): boolean {
  return day > BEAR_START && (day - BEAR_START) % BEAR_EVERY === 0;
}

/** 某个夜晚应给每名玩家刷几头绑定狼(0 表示当晚无狼) */
function wolvesForDay(day: number): number {
  if (day === FIRST_WOLF_DAY) return 1;
  if (PACK_WOLF_DAYS.includes(day)) return 2;
  if (isWolfEventDay(day)) return 2 + Math.floor(Math.random() * 4);
  return 0;
}

/** 某个夜晚应全房间刷几头熊(0 表示当晚无熊) */
function bearsForDay(day: number): number {
  return isBearEventDay(day) ? 1 + Math.floor(Math.random() * 2) : 0;
}

/**
 * 天数事件系统(仅房主端运行,客人由动物姿态快照同步表现):
 * - 第 10 天白天:各客户端自言自语「好像被什么盯上了」(走 MumbleSystem 的 stalked 触发,不在此结算);
 * - 事件日夜落时,在每名玩家视线外各刷 N 头绑定狼(不死不休追该玩家,无脱战);
 * - 第 30 天之后每过 25 天,再随机刷 1-2 头熊(全房间总量,不按玩家数翻倍)。
 * 玩家睡觉跳过事件日的夜晚时,当晚事件自然跳过,不影响后续天数的事件。
 */
export class DayEventSystem {
  private wasNight = false;

  constructor(
    private dayNight: DayNightSystem,
    private wildlife: Wildlife,
    /** 房主端全部会话(含房主);每名玩家各刷一头绑定狼 */
    private sessions: () => PlayerSession[],
    /** 给被盯上的玩家发提示(按玩家) */
    private onWolves: (session: PlayerSession, count: number) => void,
    /** 熊出没的全房提示 */
    private onBears: (count: number) => void
  ) {}

  update(): void {
    const night = this.dayNight.isNight;
    const nightfall = night && !this.wasNight;
    this.wasNight = night;
    if (!nightfall) return;

    const day = this.dayNight.day;
    const wolfCount = wolvesForDay(day);
    if (wolfCount > 0) {
      for (const session of this.sessions()) {
        let spawned = 0;
        for (let i = 0; i < wolfCount; i++) {
          if (this.wildlife.spawnRaider('wolf', session.player, session.player)) spawned += 1;
        }
        if (spawned > 0) this.onWolves(session, spawned);
      }
    }

    const bearCount = bearsForDay(day);
    if (bearCount > 0) {
      const alive = this.sessions().filter((s) => !s.survival.state.dead);
      const anchors = alive.length > 0 ? alive : this.sessions();
      let spawned = 0;
      if (anchors.length > 0) {
        for (let i = 0; i < bearCount; i++) {
          // 熊不绑定玩家:分别挑一名存活玩家作视线外生成锚点
          const anchor = anchors[Math.floor(Math.random() * anchors.length)];
          if (this.wildlife.spawnRaider('bear', anchor.player)) spawned += 1;
        }
      }
      if (spawned > 0) this.onBears(spawned);
    }
  }
}
