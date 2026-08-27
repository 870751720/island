export type InventoryState = {
  wood: number;
  stone: number;
  berry: number;
};

export class Inventory {
  readonly state: InventoryState = { wood: 0, stone: 0, berry: 0 };

  add(kind: 'wood' | 'stone' | 'berry'): void {
    this.state[kind] += 1;
  }
}
