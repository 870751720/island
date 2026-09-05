export type ResourceKind =
  | 'wood'
  | 'log'
  | 'stone'
  | 'flint'
  | 'berry'
  | 'fiber'
  | 'rope'
  | 'cola'
  | 'colaZero'
  | 'bottle'
  | 'perch'
  | 'puffer'
  | 'sardine'
  | 'cuttlefish'
  | 'loach'
  | 'shrimp'
  | 'grouper'
  | 'catfish'
  | 'swordfish'
  | 'manta'
  | 'goldenFish'
  | 'reviveStone'
  | 'poseidonBlessing'
  | 'beehiveShrine'
  | 'healCrystal'
  | 'rainAltar'
  | 'torch'
  | 'crabMeat'
  | 'birdMeat'
  | 'gameMeat'
  | 'cookedBerry'
  | 'cookedSmallFish'
  | 'cookedBigFish'
  | 'cookedGoldenFish'
  | 'cookedCrabMeat'
  | 'cookedBirdMeat'
  | 'cookedGameMeat'
  | 'arrow'
  | 'bait'
  | 'oakSeed'
  | 'pineSeed'
  | 'fruitSeed'
  | 'oakFruit'
  | 'pineFruit'
  | 'fruitFruit'
  | 'axe'
  | 'pickaxe'
  | 'hoe'
  | 'fishingrod'
  | 'bow'
  | 'sword'
  | 'fur'
  | 'grassShirt'
  | 'grassPants'
  | 'strawHat'
  | 'strawBackpack'
  | 'furShirt'
  | 'furPants'
  | 'furHat'
  | 'furBackpack'
  | 'crate'
  | 'baitBarrel'
  | 'fenceWood'
  | 'fenceStone'
  | 'fenceGate'
  | 'bed1'
  | 'bed2'
  | 'berryBush'
  | 'shrubBush'
  | 'grassTuft'
  | 'workbench1'
  | 'workbench2'
  | 'workbench3'
  | 'workbench4';

/** 一个背包格:道具类型与叠加数量,空格为 null */
export type InventorySlot = { kind: ResourceKind; count: number } | null;

/** 初始背包格数,装备背包类道具后可通过 setCapacity 扩容 */
export const DEFAULT_CAPACITY = 10;

/** 格子制背包:相同道具无上限叠加到同一格,再占用空格 */
export class Inventory {
  private slots: InventorySlot[] = Array.from({ length: DEFAULT_CAPACITY }, () => null);

  /** 拾取提示:每次实际放入道具后回调(种类与实际放入数量) */
  onAdd: ((kind: ResourceKind, count: number) => void) | null = null;

  get capacity(): number {
    return this.slots.length;
  }

  /** 丢弃全部物品并恢复初始背包容量。 */
  reset(): void {
    this.slots = Array.from({ length: DEFAULT_CAPACITY }, () => null);
  }

  /** 扩容(装备背包道具)或保持不变;只允许扩容,不缩小 */
  setCapacity(capacity: number): void {
    if (capacity <= this.slots.length) return;
    while (this.slots.length < capacity) this.slots.push(null);
  }

  /** 收缩到指定格数(卸下背包),被裁掉格子中的物品作为溢出返回 */
  shrink(capacity: number): { kind: ResourceKind; count: number }[] {
    if (capacity >= this.slots.length) return [];
    const overflow: { kind: ResourceKind; count: number }[] = [];
    for (const slot of this.slots.splice(capacity)) {
      if (slot) overflow.push({ kind: slot.kind, count: slot.count });
    }
    return overflow;
  }

  /** 放入道具(自动叠加),返回实际放入的数量,放不下的部分丢弃 */
  add(kind: ResourceKind, n = 1): number {
    let remain = n;
    for (const slot of this.slots) {
      if (remain <= 0) break;
      if (slot && slot.kind === kind) {
        slot.count += remain;
        remain = 0;
      }
    }
    for (let i = 0; i < this.slots.length && remain > 0; i++) {
      if (this.slots[i]) continue;
      this.slots[i] = { kind, count: remain };
      remain = 0;
    }
    const added = n - remain;
    if (added > 0) this.onAdd?.(kind, added);
    return added;
  }

  /** 从存档恢复格子内容(连同容量),非法数据忽略 */
  load(slots: unknown, capacity?: number): void {
    if (!Array.isArray(slots)) return;
    const restored: InventorySlot[] = slots
      .slice(0, Math.max(capacity ?? slots.length, 1))
      .map((slot) => {
        const s = slot as { kind?: unknown; count?: unknown } | null;
        return s &&
          typeof s.kind === 'string' &&
          typeof s.count === 'number' &&
          s.count > 0
          ? { kind: s.kind as ResourceKind, count: s.count }
          : null;
      });
    if (restored.length > 0) this.slots = restored;
  }

  /** 该种类道具是否还能放入(已有同种格或有空格;叠加无上限) */
  canFit(kind: ResourceKind): boolean {
    return this.slots.some((slot) => !slot || slot.kind === kind);
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

  /** 把 from 格道具移到 to 格:同类合并进 to,否则互换位置;下标非法或源格为空时不动作 */
  move(from: number, to: number): boolean {
    if (from === to) return false;
    const source = this.slots[from];
    const target = this.slots[to];
    if (!source || to < 0 || to >= this.slots.length) return false;
    if (!target) {
      this.slots[to] = source;
      this.slots[from] = null;
    } else if (target.kind === source.kind) {
      target.count += source.count;
      this.slots[from] = null;
    } else {
      this.slots[from] = target;
      this.slots[to] = source;
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
