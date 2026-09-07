/** 弹药类道具:不进背包,作为独立计数挂在玩家会话上(弓的箭、鱼竿的鱼饵) */
export type AmmoKind = 'arrow' | 'bait';

/** 玩家弹药存储:与 tools/equipped 同级的独立持有物,无上限叠加 */
export class AmmoStore {
  arrow = 0;
  bait = 0;

  count(kind: AmmoKind): number {
    return this[kind];
  }

  add(kind: AmmoKind, n = 1): number {
    this[kind] += n;
    return n;
  }

  remove(kind: AmmoKind, n = 1): boolean {
    if (this[kind] < n) return false;
    this[kind] -= n;
    return true;
  }

  reset(): void {
    this.arrow = 0;
    this.bait = 0;
  }

  snapshot(): { arrow: number; bait: number } {
    return { arrow: this.arrow, bait: this.bait };
  }
}
