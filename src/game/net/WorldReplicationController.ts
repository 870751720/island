import type { NetHost } from './NetHost';
import type { NetGuest } from './NetGuest';
import type { WorldPatch } from './Protocol';
import { applyWorldDelta, type WorldDeltaOp } from './WorldDelta';
import type { EntityChange } from '../systems/WorldEntityId';
import type { WorldSaveSystems } from '../systems/WorldSaveCodec';

/** Replicates discrete world entities while keeping host authority and guest revision ordering. */
export class WorldReplicationController {
  private revision = 0;
  private mirror: WorldPatch | null = null;
  private resyncPending = false;

  constructor(
    private readonly systems: WorldSaveSystems,
    private readonly host: () => NetHost | null,
    private readonly guest: NetGuest | null
  ) {}

  snapshot(): WorldPatch {
    const s = this.systems;
    return {
      props: s.props.snapshot().map(({ regrowLeft: _, ...prop }) => prop),
      campfires: s.campfire.snapshot(),
      workbenches: s.workbench.snapshot(),
      workbenchCrafted: s.workbench.hasCrafted,
      crates: s.crates.snapshot(),
      baitBarrels: s.baitBarrels.snapshot(),
      brewBarrels: s.brewBarrels.snapshot(),
      waterPurifiers: s.waterPurifiers.snapshot(),
      smelters: s.smelters.snapshot(),
      cookingStations: s.cookingStations.snapshot(),
      looms: s.looms.snapshot(),
      fences: s.fences.snapshotFences(),
      fenceGates: s.fences.snapshotGates(),
      beds: s.beds.snapshot(),
      shrines: s.shrines.snapshot(),
      soils: s.soils.snapshot(),
      stakes: s.stakes.snapshot(),
      drops: s.drops.snapshot(),
      burrows: s.burrows.netSnapshot(),
    };
  }

  bindHostChangeSinks(): void {
    const send = (section: keyof WorldPatch) =>
      (change: EntityChange) => this.host()?.broadcastWorldChange(section, change);
    const s = this.systems;
    s.props.setChangeSink(send('props'));
    s.campfire.setChangeSink(send('campfires'));
    s.workbench.setChangeSink((change) => {
      send('workbenches')(change);
      if (change.op === 'add' && s.workbench.hasCrafted) {
        send('workbenchCrafted')({ op: 'set', id: '', fields: { value: true } });
      }
    });
    s.crates.setChangeSink(send('crates'));
    s.baitBarrels.setChangeSink(send('baitBarrels'));
    s.brewBarrels.setChangeSink(send('brewBarrels'));
    s.waterPurifiers.setChangeSink(send('waterPurifiers'));
    s.burrows.setChangeSink(send('burrows'));
    s.smelters.setChangeSink(send('smelters'));
    s.cookingStations.setChangeSink(send('cookingStations'));
    s.looms.setChangeSink(send('looms'));
    s.fences.setChangeSinks(send('fences'), send('fenceGates'));
    s.beds.setChangeSink(send('beds'));
    s.shrines.setChangeSink(send('shrines'));
    s.soils.setChangeSink(send('soils'));
    s.stakes.setChangeSink(send('stakes'));
    s.drops.setChangeSink(send('drops'));
  }

  beginGuest(revision: number): void {
    this.mirror = this.snapshot();
    this.revision = revision;
  }

  applyDelta(revision: number, ops: WorldDeltaOp[]): void {
    if (!this.mirror || revision <= this.revision || this.resyncPending) return;
    if (revision !== this.revision + 1) {
      this.resyncPending = true;
      this.guest?.requestWorldResync(this.revision);
      return;
    }
    this.revision = revision;
    const changed = applyWorldDelta(this.mirror, ops);
    const propOps = ops.filter((op) => op.section === 'props');
    const propsAppliedInPlace = propOps.length > 0 && this.systems.props.applyNetDelta(propOps);
    const patch: WorldPatch = {};
    for (const section of changed) {
      if (section === 'props' && propsAppliedInPlace) continue;
      Object.assign(patch, { [section]: this.mirror[section] });
    }
    if (changed.has('fences') || changed.has('fenceGates')) {
      patch.fences = this.mirror.fences;
      patch.fenceGates = this.mirror.fenceGates;
    }
    this.apply(patch);
  }

  applyFull(revision: number, state: WorldPatch): void {
    this.mirror = state;
    this.revision = revision;
    this.resyncPending = false;
    this.apply(state);
  }

  apply(state: WorldPatch): void {
    const s = this.systems;
    if (state.props) s.props.applySave(state.props);
    if (state.campfires) s.campfire.netApply(state.campfires);
    if (state.workbenches) s.workbench.netApply(state.workbenches);
    if (state.workbenchCrafted) s.workbench.restoreCrafted();
    if (state.crates) s.crates.netApply(state.crates);
    if (state.baitBarrels) s.baitBarrels.netApply(state.baitBarrels);
    if (state.brewBarrels) s.brewBarrels.netApply(state.brewBarrels);
    if (state.waterPurifiers) s.waterPurifiers.netApply(state.waterPurifiers);
    if (state.burrows) s.burrows.netApply(state.burrows);
    if (state.smelters) s.smelters.netApply(state.smelters);
    if (state.cookingStations) s.cookingStations.netApply(state.cookingStations);
    if (state.looms) s.looms.netApply(state.looms);
    if (state.fences || state.fenceGates) s.fences.netApply(state.fences ?? [], state.fenceGates ?? []);
    if (state.beds) s.beds.netApply(state.beds);
    if (state.shrines) s.shrines.netApply(state.shrines);
    if (state.soils) s.soils.netApply(state.soils);
    if (state.stakes) s.stakes.netApply(state.stakes);
    if (state.drops) s.drops.netApply(state.drops);
  }
}
