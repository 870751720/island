import type { FoodEater } from './Food';
import type { ResourceKind } from './Inventory';

export type TameSpecies = Exclude<FoodEater, 'dog' | 'cat'>;
export const HEART_MAX: Record<TameSpecies, number> = { rabbit: 30, sheep: 60, bison: 100, wolf: 150, bear: 200 };
export const PRODUCTION_SECONDS = 600;
export const HOME_RADIUS = 15;
/** 畜牧产出表:驯养成年动物定时产出的奶,绵羊额外长毛(持剪刀收取);结算、生物图鉴与物品来源共用 */
export const LIVESTOCK_PRODUCE: Readonly<Partial<Record<TameSpecies, { milk: ResourceKind; wool?: ResourceKind }>>> = {
  sheep: { milk: 'milk', wool: 'wool' },
  bison: { milk: 'cowMilk' },
};
export type HusbandryState = {
  tamed: boolean;
  heart: number;
  seeking: boolean;
  cooldown: number;
  eating: number;
  home: { x: number; z: number } | null;
  milkLeft: number;
  milk: boolean;
  woolLeft: number;
  wool: boolean;
  shorn: boolean;
};

export function newHusbandry(): HusbandryState {
  return { tamed: false, heart: 0, seeking: false, cooldown: 0, eating: 0, home: null,
    milkLeft: PRODUCTION_SECONDS, milk: false, woolLeft: PRODUCTION_SECONDS, wool: false, shorn: false };
}

export function restoreHusbandry(value: Partial<HusbandryState> | undefined, species: TameSpecies): HusbandryState {
  const state = newHusbandry();
  if (!value) return state;
  const bounded = (n: number | undefined, max: number, fallback = 0) => Number.isFinite(n) ? Math.max(0, Math.min(max, n!)) : fallback;
  state.heart = bounded(value.heart, HEART_MAX[species]);
  state.tamed = value.tamed === true && state.heart > 0;
  state.seeking = state.tamed && !!value.seeking;
  state.cooldown = bounded(value.cooldown, 5);
  state.milkLeft = bounded(value.milkLeft, PRODUCTION_SECONDS, PRODUCTION_SECONDS);
  state.woolLeft = bounded(value.woolLeft, PRODUCTION_SECONDS, PRODUCTION_SECONDS);
  state.milk = state.tamed && !!value.milk;
  state.wool = state.tamed && !!value.wool;
  state.shorn = !!value.shorn;
  if (state.tamed && value.home && Number.isFinite(value.home.x) && Number.isFinite(value.home.z)) state.home = { ...value.home };
  return state;
}

/** 返回本帧是否失去驯养。所有计时只在房主运行秒数上推进。 */
export function advanceHusbandry(state: HusbandryState, species: TameSpecies, adult: boolean, delta: number, decaySpeed = 1, productionSpeed = 1): boolean {
  if (delta <= 0) return false;
  state.cooldown = Math.max(0, state.cooldown - delta);
  state.eating = Math.max(0, state.eating - delta);
  if (!state.tamed) return false;
  state.heart = Math.max(0, state.heart - HEART_MAX[species] * delta * decaySpeed / 1800);
  if (state.heart <= 0) {
    const shorn = state.shorn;
    Object.assign(state, newHusbandry(), { shorn });
    return true;
  }
  if (state.heart < HEART_MAX[species] * 0.7) state.seeking = true;
  const produce = LIVESTOCK_PRODUCE[species];
  if (adult && produce) {
    if (!state.milk) { state.milkLeft = Math.max(0, state.milkLeft - delta * productionSpeed); state.milk = state.milkLeft === 0; }
    if (produce.wool && !state.wool) {
      state.woolLeft = Math.max(0, state.woolLeft - delta * productionSpeed);
      if (state.woolLeft === 0) { state.wool = true; state.shorn = false; }
    }
  }
  return false;
}

/** 返回是否首次填满，调用方负责清理战斗与繁殖状态。 */
export function feedAnimal(state: HusbandryState, species: TameSpecies, hunger: number): boolean {
  if (state.cooldown > 0 || hunger <= 0) return false;
  const before = state.tamed;
  state.heart = Math.min(HEART_MAX[species], state.heart + hunger);
  state.cooldown = 5;
  state.eating = 1.6;
  if (state.heart >= HEART_MAX[species]) { state.tamed = true; state.seeking = false; }
  return !before && state.tamed;
}
