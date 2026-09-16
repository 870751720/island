export type FirstDropKind = 'flint' | 'adventureBook';
export type FirstDropSave = Partial<Record<FirstDropKind, { attempts: number; done: boolean }>>;

const LIMITS: Record<FirstDropKind, number> = { flint: 2, adventureBook: 3 };

/** 每位玩家单局首份产出保底；自然产出同样结束保底，之后不再累计。 */
export class FirstDropGuarantee {
  private state: FirstDropSave = {};

  restore(save?: FirstDropSave): void { this.state = structuredClone(save ?? {}); }
  snapshot(): FirstDropSave { return structuredClone(this.state); }

  /** 一次完整采石或击杀结算后调用，返回是否需要额外补出一份。 */
  settle(kind: FirstDropKind, naturallyDropped: boolean): boolean {
    const progress = this.state[kind] ??= { attempts: 0, done: false };
    if (progress.done) return false;
    progress.attempts += 1;
    const guaranteed = !naturallyDropped && progress.attempts >= LIMITS[kind];
    progress.done = naturallyDropped || guaranteed;
    return guaranteed;
  }
}
