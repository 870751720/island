import type { IslandTerrain } from '../IslandTerrain';
import { Vector3 } from 'three';
import type { WorldSaveSystems } from '../../systems/WorldSaveCodec';
import type { SaveData } from '../../systems/SaveSystem';
import { CROP_SPECS } from '../../entities/Crop';
import { createWorldEntityId } from '../../systems/WorldEntityId';
import { landmarkBlueprint, rollLandmark, rollLandmarkCount, type LandmarkChoice } from './LandmarkDefinitions';
import { findLandmarkSite, landmarkPoint, type LandmarkSite } from './LandmarkPlacement';

type SiteContents = Pick<SaveData, 'beds' | 'campfires' | 'crates' | 'workbenches' | 'baitBarrels' | 'brewBarrels' | 'smelters' | 'looms' | 'fences' | 'shrines' | 'soils' | 'crops'>;

/** 地点只负责组合；生成后的设施完全归已有系统管理，挖走、消耗、读档均不会再生。 */
export class LandmarkSystem {
  private reserved: LandmarkSite[] = [];
  constructor(private terrain: IslandTerrain, private systems: WorldSaveSystems) {}

  generate(chances: readonly number[]): void {
    const count = rollLandmarkCount(chances);
    for (let i = 0; i < count; i++) this.spawn('random');
  }

  spawn(choice: LandmarkChoice, near?: { x: number; z: number }, avoidPlayers: readonly { x: number; z: number }[] = []): string | null {
    const kind = choice === 'random' ? rollLandmark() : choice;
    const blueprint = landmarkBlueprint(kind);
    const s = this.systems;
    // 一次性空间索引，避免选址时对全岛设施/资源反复线性扫描。
    const blocked = new Set<string>();
    const block = (x: number, z: number, radius: number) => {
      for (let dx = -radius; dx <= radius; dx += 2) for (let dz = -radius; dz <= radius; dz += 2) {
        blocked.add(`${Math.floor((x + dx) / 2)},${Math.floor((z + dz) / 2)}`);
      }
    };
    const lists = [s.beds.snapshot(), s.campfire.snapshot(), s.crates.snapshot(), s.workbench.snapshot(),
      s.baitBarrels.snapshot(), s.brewBarrels.snapshot(), s.smelters.snapshot(), s.looms.snapshot(),
      s.fences.snapshotFences(), s.fences.snapshotGates(), s.shrines.snapshot(), s.soils.snapshot(),
      s.waterPurifiers.snapshot(), s.cookingStations.snapshot(), s.stakes.snapshot(), s.burrows.snapshot()];
    for (const list of lists) for (const entity of list) block(entity.x, entity.z, 4);
    for (const player of avoidPlayers) block(player.x, player.z, 2);
    const check = new Vector3();
    const site = findLandmarkSite(this.terrain, blueprint,
      (x, z) => blocked.has(`${Math.floor(x / 2)},${Math.floor(z / 2)}`), this.reserved, near, Math.random,
      near ? (x, z) => s.props.isBlocked(x, z, 1.8)
        || s.props.isOccupied(check.set(x, this.terrain.getHeight(x, z), z), 1.8) : undefined);
    if (!site) return null;
    // 新岛生成的天然资源可以让出场地；GM 不删除任何现有资源或玩家种植物。
    if (!near) s.props.applySave(s.props.snapshot().filter(p => Math.hypot(p.x - site.x, p.z - site.z) > site.radius + 2));
    const data: SiteContents = { beds: [], campfires: [], crates: [], workbenches: [], baitBarrels: [],
      brewBarrels: [], smelters: [], looms: [], fences: [], shrines: [], soils: [], crops: [] };
    for (const part of blueprint.parts) {
      const at = landmarkPoint(site, part.x, part.z);
      const placement = { ...at, y: this.terrain.getHeight(at.x, at.z),
        rotY: site.rotation + (part.rotation ?? 0), id: createWorldEntityId('landmark') };
      switch (part.type) {
        case 'bed': data.beds.push({ ...placement, level: part.level ?? 1 }); break;
        case 'fire': data.campfires.push({ ...placement, fuel: 0 }); break;
        case 'crate': data.crates.push({ ...placement, kind: 'crate', slots: part.loot ?? [] }); break;
        case 'bench': data.workbenches.push({ ...placement, level: part.level ?? 1 }); break;
        case 'bait': data.baitBarrels.push({ ...placement, foods: [], bait: 3, tickLeft: 5 }); break;
        case 'brew': data.brewBarrels.push({ ...placement, kind: null, rawLeft: 0, bottles: 0, tickLeft: 45 }); break;
        case 'smelter': data.smelters.push({ ...placement, fuel: 0, ore: 0, ingot: 0, tickLeft: 15 }); break;
        case 'loom': data.looms.push({ ...placement, rope: 0, cloth: 0, tickLeft: 6 }); break;
        case 'fence': data.fences.push({ ...placement, kind: part.stone ? 'stone' : 'branch' }); break;
        case 'torch': data.shrines.push({ ...placement, kind: 'torch' }); break;
        case 'shrine': if (part.shrine) data.shrines.push({ ...placement, kind: part.shrine }); break;
        case 'crop': if (part.crop) {
          const spec = CROP_SPECS[part.crop];
          data.soils.push(placement);
          data.crops.push({ ...placement, id: createWorldEntityId('landmark'), kind: part.crop,
            grown: (spec.sproutSeconds + spec.immatureSeconds) * (Math.random() < 0.7 ? 1 : 0.5) });
        } break;
      }
    }
    s.beds.restore(data.beds); s.campfire.restore(data.campfires); s.crates.restore(data.crates);
    s.workbench.restore(data.workbenches); s.baitBarrels.restore(data.baitBarrels);
    s.brewBarrels.restore(data.brewBarrels); s.smelters.restore(data.smelters); s.looms.restore(data.looms);
    s.fences.restore(data.fences, []); s.shrines.restore(data.shrines);
    s.soils.restore(data.soils); s.crops.restore(data.crops);
    this.reserved.push(site);
    return kind;
  }
}
