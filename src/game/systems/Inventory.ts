export type ResourceKind = 'wood' | 'stone' | 'berry';

export type InventoryState = Record<ResourceKind, number>;

export class Inventory {
  readonly state: InventoryState = { wood: 0, stone: 0, berry: 0 };

  add(kind: ResourceKind, n = 1): void {
    this.state[kind] += n;
  }

  remove(kind: ResourceKind, n = 1): boolean {
    if (this.state[kind] < n) return false;
    this.state[kind] -= n;
    return true;
  }
}
