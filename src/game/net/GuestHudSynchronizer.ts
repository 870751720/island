import * as THREE from 'three';
import type { HudSnapshot } from '../GameContracts';
import type { PlayerSession } from '../mp/PlayerSession';
import type { GameAudio } from '../audio/GameAudio';
import type { Particles } from '../fx/Particles';
import type { PickupPresentation } from '../presentation/PickupPresentation';
import { FOODS } from '../systems/Food';
import type { FishTier } from '../systems/FishTable';
import type { InventorySlot, ResourceKind } from '../systems/Inventory';
import { SLOT_ORDER } from '../systems/Equipment';

const countSlots = (slots: readonly InventorySlot[]): Map<ResourceKind, number> => {
  const counts = new Map<ResourceKind, number>();
  for (const slot of slots) if (slot) counts.set(slot.kind, (counts.get(slot.kind) ?? 0) + slot.count);
  return counts;
};

/** Applies host HUD snapshots to guest-owned state and replays local-only feedback. */
export class GuestHudSynchronizer {
  private indicatorState: HudSnapshot['indicator'] = { label: null, progress: null };
  private indicatorProgress: number | null = null;
  private indicatorVelocity = 0;
  private indicatorAt = 0;
  private eatTick = 0;

  constructor(
    private readonly local: PlayerSession,
    private readonly pickup: PickupPresentation,
    private readonly audio: GameAudio,
    private readonly fx: Particles,
    private readonly syncToolTiers: () => void,
    private readonly pushHud: (snapshot: HudSnapshot) => void,
    private readonly localOverlay: () => Pick<HudSnapshot, 'autoEquipProgress' | 'notice'>
  ) {}

  apply(snapshot: HudSnapshot): void {
    const before = countSlots(this.local.inventory.snapshot());
    this.local.inventory.load(snapshot.slots, snapshot.capacity);
    for (const [kind, count] of countSlots(snapshot.slots)) {
      const gained = count - (before.get(kind) ?? 0);
      if (gained > 0) this.pickup.emit(kind, gained);
    }
    Object.assign(this.local.tools, snapshot.toolTiers);
    for (const kind of ['arrow', 'bait'] as const) {
      const gained = snapshot[kind] - this.local.ammo.count(kind);
      this.local.ammo[kind] = snapshot[kind];
      if (gained > 0) this.pickup.emit(kind, gained);
    }
    this.local.craftedIds.clear();
    for (const id of snapshot.craftedIds) this.local.craftedIds.add(id);
    this.syncToolTiers();
    this.local.player.setTool(snapshot.tool);
    if (SLOT_ORDER.some((slot) => this.local.equipment.getEquipped(slot) !== snapshot.equipped[slot])) {
      this.local.equipment.restore(snapshot.equipped, this.local.inventory);
    }
    this.updateIndicatorState(snapshot.indicator);
    this.audio.silent = true;
    this.local.fishing.netSyncState(snapshot.fishingState, snapshot.biteClicks, snapshot.fishingTier as FishTier, snapshot.fishingWaitLeft);
    this.audio.silent = false;
    this.replayEating(snapshot);
    this.pushHud({ ...snapshot, ...this.localOverlay() });
  }

  indicator(delta: number): HudSnapshot['indicator'] {
    if (this.indicatorState.progress === null) return this.indicatorState;
    const age = Math.min(0.25, performance.now() / 1000 - this.indicatorAt);
    const estimated = THREE.MathUtils.clamp(this.indicatorState.progress + this.indicatorVelocity * age, 0, 1);
    this.indicatorProgress = THREE.MathUtils.lerp(
      this.indicatorProgress ?? estimated,
      estimated,
      1 - Math.exp(-18 * delta)
    );
    return { ...this.indicatorState, progress: this.indicatorProgress };
  }

  private updateIndicatorState(next: HudSnapshot['indicator']): void {
    const now = performance.now() / 1000;
    if (this.indicatorState.label === next.label && this.indicatorState.progress !== null && next.progress !== null && this.indicatorAt > 0) {
      const elapsed = Math.max(0.05, now - this.indicatorAt);
      this.indicatorVelocity = THREE.MathUtils.clamp((next.progress - this.indicatorState.progress) / elapsed, -2, 2);
    } else {
      this.indicatorVelocity = 0;
      this.indicatorProgress = next.progress;
    }
    this.indicatorState = next;
    this.indicatorAt = now;
  }

  private replayEating(snapshot: HudSnapshot): void {
    const food = snapshot.eatName ? FOODS.find((candidate) => candidate.name === snapshot.eatName) : null;
    if (!food) {
      this.eatTick = 0;
      return;
    }
    const tick = Math.floor(snapshot.eatProgress * 3);
    if (tick === this.eatTick) return;
    this.eatTick = tick;
    if (tick < 1) return;
    this.audio.play('munch');
    const position = this.local.player.group.position.clone();
    position.y += 2;
    this.fx.burst(position, food.fxColor, 3);
  }
}
