/** 季节类型:按 18 天一轮在春→夏→秋→冬间推进 */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** 一个季节的天数 */
export const SEASON_LENGTH = 18;

const ORDER: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];

/** 当前季节(房主权威推进,客人由快照回流;GM 强制季节不写回这里) */
let season: Season = 'spring';
/** 当前季节第一天的天数锚点(seasonStartDay ~ +17 为本季) */
let seasonStartDay = 1;

export function getSeason(): Season {
  return season;
}

/** 当前季节第一天对应的天数(存档与换季判定用) */
export function getSeasonStartDay(): number {
  return seasonStartDay;
}

/** 直接设置季节状态(读档恢复/客人接收快照) */
export function setSeason(next: Season, startDay = seasonStartDay): void {
  season = next;
  if (Number.isFinite(startDay) && startDay >= 1) seasonStartDay = Math.floor(startDay);
}

/**
 * 新开局掷初始季节:91% 春季第一天,夏/秋/冬各 3%(也均为该季第一天)。
 */
export function rollInitialSeason(day = 1): void {
  const r = Math.random();
  const next = r < 0.91 ? 'spring'
    : ORDER[1 + Math.min(2, Math.floor((r - 0.91) / 0.03))];
  setSeason(next, day);
}

/**
 * 按当前天数推进季节(房主/单机每帧调用;天数跨过本季末尾时轮换下一季,
 * 可跨多季连跳,支持 GM 大幅改天数)。返回新季节(无变化返回 null),
 * 调用方据此在入冬时强制降雪。天数被回拨到锚点之前时仅重锚,不改标签。
 */
export function advanceSeasonForDay(day: number): Season | null {
  if (!Number.isFinite(day) || day < 1) return null;
  if (day < seasonStartDay) {
    seasonStartDay = Math.floor(day);
    return null;
  }
  let changed: Season | null = null;
  while (day >= seasonStartDay + SEASON_LENGTH) {
    seasonStartDay += SEASON_LENGTH;
    season = ORDER[(ORDER.indexOf(season) + 1) % ORDER.length];
    changed = season;
  }
  return changed;
}
