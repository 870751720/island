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
  private failures = new WeakMap<HabitatSlot<K>, number>();
  readonly slots: HabitatSlot<K>[] = [];

  add(kind: K, home: GroundPoint, count: number, radius: number, recovery: [number, number]): void {
    for (let i = 0; i < count; i++) {
      this.slots.push({ kind, home, radius, occupied: false, cooldown: 0, recovery });
    }
  }

  release(slot: HabitatSlot<K> | undefined): void {
    if (!slot || !slot.occupied) return;
    slot.occupied = false;
    this.failures.delete(slot);
    slot.cooldown = slot.recovery[0] + Math.random() * (slot.recovery[1] - slot.recovery[0]);
  }

  update(delta: number, spawn: (slot: HabitatSlot<K>) => boolean, relocate?: (slot: HabitatSlot<K>) => boolean): void {
    const replenished = new Set<GroundPoint>();
    for (const slot of this.slots) {
      if (slot.occupied) continue;
      slot.cooldown -= delta;
      if (slot.cooldown > 0 || replenished.has(slot.home)) continue;
      if (spawn(slot)) {
        slot.occupied = true;
        this.failures.delete(slot);
        replenished.add(slot.home);
        // Stagger siblings even when a long update expires several vacancies at once.
        for (const sibling of this.slots) {
          if (sibling !== slot && sibling.home === slot.home && !sibling.occupied) sibling.cooldown = Math.max(15, sibling.cooldown);
        }
      } else {
        const failures = (this.failures.get(slot) ?? 0) + 1;
        // Initial failure, then two retries. Relocation never bypasses spawn validation.
        if (failures >= 3) {
          if (relocate?.(slot)) {
            for (const sibling of this.slots) {
              if (!sibling.occupied && sibling.home === slot.home) {
                this.failures.delete(sibling);
                sibling.cooldown = Math.max(10, sibling.cooldown);
              }
            }
          }
          this.failures.delete(slot);
        } else this.failures.set(slot, failures);
        slot.cooldown = 10;
      }
    }
  }
}
