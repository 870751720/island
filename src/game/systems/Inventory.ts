export type ResourceKind =
  | 'wood'
  | 'log'
  | 'stone'
  | 'flint'
  | 'berry'
  | 'fiber'
  | 'rope'
  | 'fish'
  | 'crabMeat'
  | 'birdMeat'
  | 'cookedBerry'
  | 'cookedFish'
  | 'cookedCrabMeat'
  | 'cookedBirdMeat'
  | 'arrow';

/** 一个背包格:道具类型与叠加数量,空格为 null */
export type InventorySlot = { kind: ResourceKind; count: number } | null;

/** 初始背包格数,装备背包类道具后可通过 setCapacity 扩容 */
export const DEFAULT_CAPACITY = 10;

/** 同种道具在单个格子内的最大叠加数 */
export const MAX_STACK = 20;

/** 格子制背包:相同道具自动叠加,先叠满已有格子再占用空格 */
export class Inventory {
  private slots: InventorySlot[] = Array.from({ length: DEFAULT_CAPACITY }, () => null);

  get capacity(): number {
    return this.slots.length;
  }

  /** 扩容(装备背包道具)或保持不变;只允许扩容,不缩小 */
  setCapacity(capacity: number): void {
    if (capacity <= this.slots.length) return;
    while (this.slots.length < capacity) this.slots.push(null);
  }

  /** 放入道具(自动叠加),返回实际放入的数量,放不下的部分丢弃 */
  add(kind: ResourceKind, n = 1): number {
    let remain = n;
    for (const slot of this.slots) {
      if (remain <= 0) break;
      if (slot && slot.kind === kind && slot.count < MAX_STACK) {
        const take = Math.min(MAX_STACK - slot.count, remain);
        slot.count += take;
        remain -= take;
      }
    }
    for (let i = 0; i < this.slots.length && remain > 0; i++) {
      if (this.slots[i]) continue;
      const take = Math.min(MAX_STACK, remain);
      this.slots[i] = { kind, count: take };
      remain -= take;
    }
    return n - remain;
  }

  count(kind: ResourceKind): number {
    return this.slots.reduce(
      (sum, slot) => sum + (slot && slot.kind === kind ? slot.count : 0),
      0
    );
  }

  /** 从后往前扣除(保留靠前的格子),数量不足时不扣并返回 false */
  remove(kind: ResourceKind, n = 1): boolean {
    if (this.count(kind) < n) return false;
    let remain = n;
    for (let i = this.slots.length - 1; i >= 0 && remain > 0; i--) {
      const slot = this.slots[i];
      if (!slot || slot.kind !== kind) continue;
      const take = Math.min(slot.count, remain);
      slot.count -= take;
      remain -= take;
      if (slot.count <= 0) this.slots[i] = null;
    }
    return true;
  }

  /** 剩余空格数 */
  get freeSlots(): number {
    return this.slots.filter((slot) => slot === null).length;
  }

  /** 当前格子快照(供 HUD/背包 UI 渲染) */
  snapshot(): InventorySlot[] {
    return this.slots.map((slot) => (slot ? { ...slot } : null));
  }
}
