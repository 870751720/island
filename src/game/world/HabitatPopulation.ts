import type { GroundPoint } from './SpawnLayout';

export type HabitatSlot<K extends string> = {
  kind: K;
  home: GroundPoint;
  radius: number;
  occupied: boolean;
  cooldown: number;
  recovery: [number, number];
};

/** Authority-only population budget. Death starts a real-time cooldown per vacant slot. */
export class HabitatPopulation<K extends string> {
  readonly slots: HabitatSlot<K>[] = [];

  add(kind: K, home: GroundPoint, count: number, radius: number, recovery: [number, number]): void {
    for (let i = 0; i < count; i++) {
      this.slots.push({ kind, home, radius, occupied: false, cooldown: 0, recovery });
    }
  }

  release(slot: HabitatSlot<K> | undefined): void {
    if (!slot || !slot.occupied) return;
    slot.occupied = false;
    slot.cooldown = slot.recovery[0] + Math.random() * (slot.recovery[1] - slot.recovery[0]);
  }

  update(delta: number, spawn: (slot: HabitatSlot<K>) => boolean): void {
    const replenished = new Set<GroundPoint>();
    for (const slot of this.slots) {
      if (slot.occupied) continue;
      slot.cooldown -= delta;
      if (slot.cooldown > 0 || replenished.has(slot.home)) continue;
      if (spawn(slot)) {
        slot.occupied = true;
        replenished.add(slot.home);
        // Stagger siblings even when a long update expires several vacancies at once.
        for (const sibling of this.slots) {
          if (sibling !== slot && sibling.home === slot.home && !sibling.occupied) sibling.cooldown = Math.max(15, sibling.cooldown);
        }
      } else slot.cooldown = 10;
    }
  }
}
