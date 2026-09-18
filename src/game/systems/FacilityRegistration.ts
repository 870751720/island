import { ResearchTable } from '../entities/ResearchTable';
import * as THREE from 'three';
import type { WorldSaveSystems } from './WorldSaveCodec';
import type { PlayerSession } from '../mp/PlayerSession';
import type { ResourceKind } from './Inventory';
import type { IslandTerrain } from '../world/IslandTerrain';
import { AutoPlaceSystem, buildGhost, snapAheadCell } from './AutoPlace';
import type { FacilityDef, FacilityKind } from './Facilities';
import { ITEMS } from './Items';
import { createAmbientFacility } from './AmbientFacilitySystem';
import { roadFacility } from './RoadFacility';
import { soilFacility } from './SoilFacility';
import { CROP_SPECS, makeCropSproutPreview } from '../entities/Crop';
import { makeTreeSproutPreview, makeBerryBush, makeGrassTuft, makeShrub, makeWormNest } from '../world/Props';
import { SEED_OF, TREE_SPECIES, type TreeSpecies } from '../world/TreeSpecies';
import { makeFenceHandModel, makeFenceGateHandModel, makeFenceGhost, makeGateGhost } from './FenceSystem';
import { Crate } from '../entities/Crate';
import { BaitBarrel } from '../entities/BaitBarrel';
import { BrewBarrel } from '../entities/BrewBarrel';
import { Doghouse } from '../entities/Doghouse';
import { WaterPurifier } from '../entities/WaterPurifier';
import { Smelter } from '../entities/Smelter';
import { Loom } from '../entities/Loom';
import { Mill } from '../entities/Mill';
import { CookingStation } from '../entities/CookingStation';
import { Campfire } from '../entities/Campfire';
import { Bed } from '../entities/Bed';
import { Workbench } from '../entities/Workbench';

export type FacilityRegistrationContext = Pick<WorldSaveSystems, 'baitBarrels' | 'beds' | 'brewBarrels' | 'burrows' | 'campfire' | 'cookingStations' | 'crates' | 'crops' | 'doghouses' | 'fences' | 'gravelPaths' | 'looms' | 'mills' | 'researchTables' | 'plankPaths' | 'shrines' | 'smelters' | 'soils' | 'waterPurifiers' | 'workbench'> & {
  autoPlace: AutoPlaceSystem;
  terrain: IslandTerrain;
  bushCellOk: (actor: PlayerSession, x: number, z: number) => string | null;
  placeTree: (species: TreeSpecies, at: THREE.Vector3, actor: PlayerSession) => boolean;
  placeBush: (kind: 'berryBush' | 'shrubBush' | 'grassTuft' | 'wormNest', at: THREE.Vector3, actor: PlayerSession) => boolean;
};

/** 所有安放入口、预览与回收来源在同一处装配；背包和提示均消费注册结果。 */
export function registerFacilities(context: FacilityRegistrationContext): void {
  context.autoPlace.interactions.register(context.burrows);
  const def = (kind: FacilityKind, facility: FacilityDef): void => {
    context.autoPlace.register(kind, facility);
  };
  const ghost = (build: (scene: THREE.Scene) => THREE.Object3D): (() => THREE.Object3D) =>
    () => buildGhost(build);
  // 木箱/铁箱
  def('crate', { recovery: context.crates, tool: 'place', valid: (a, x, z) => context.crates.canPlaceAt(a, x, z), buildPreview: ghost((sc) => new Crate(sc, new THREE.Vector3(), 'crate').group), place: (a, at) => context.crates.use(a, 'crate', at) });
  def('feedBarrel', { recovery: context.crates, tool: 'place', valid: (a, x, z) => context.crates.canPlaceAt(a, x, z), buildPreview: ghost((sc) => new Crate(sc, new THREE.Vector3(), 'feedBarrel').group), place: (a, at) => context.crates.use(a, 'feedBarrel', at) });
  def('ironCrate', { recovery: context.crates, tool: 'place', valid: (a, x, z) => context.crates.canPlaceAt(a, x, z), buildPreview: ghost((sc) => new Crate(sc, new THREE.Vector3(), 'ironCrate').group), place: (a, at) => context.crates.use(a, 'ironCrate', at) });
  def('fishKeep', { recovery: context.crates, tool: 'place', valid: (a, x, z) => context.crates.canPlaceAt(a, x, z, 'fishKeep'), buildPreview: ghost((sc) => new Crate(sc, new THREE.Vector3(), 'fishKeep').group), place: (a, at) => context.crates.use(a, 'fishKeep', at) });
  // 饵料桶/酿酒桶/净水器/冶炼炉/纺织机/烹饪台
  def('baitBarrel', { recovery: context.baitBarrels, tool: 'place', valid: (a, x, z) => context.baitBarrels.canPlaceAt(a, x, z), buildPreview: ghost((sc) => new BaitBarrel(sc, new THREE.Vector3(), 0).group), place: (a, at) => context.baitBarrels.use(a, at) });
  def('brewBarrel', { recovery: context.brewBarrels, tool: 'place', valid: (a, x, z) => context.brewBarrels.canPlaceAt(a, x, z), buildPreview: ghost((sc) => new BrewBarrel(sc, new THREE.Vector3(), 0).group), place: (a, at) => context.brewBarrels.use(a, at) });
  def('doghouse', {
    recovery: context.doghouses,
    tool: 'place',
    valid: (a, x, z) => context.doghouses.canPlaceAt(a, x, z),
    buildPreview: ghost((sc) => new Doghouse(sc, new THREE.Vector3()).group),
    place: (a, at) => context.doghouses.use(a, at),
  });
  def('waterPurifier', {
    recovery: context.waterPurifiers,
    tool: 'place',
    valid: (a, x, z) => context.waterPurifiers.canPlaceAt(a, x, z),
    buildPreview: ghost((sc) => new WaterPurifier(sc, new THREE.Vector3(), 0).group),
    place: (a, at) => context.waterPurifiers.use(a, at),
    failText: () => '净化器只能放在海边湿沙滩上,去浅滩试试',
  });
  def('smelter', { recovery: context.smelters, tool: 'place', valid: (a, x, z) => context.smelters.canPlaceAt(a, x, z), buildPreview: ghost((sc) => new Smelter(sc, new THREE.Vector3(), 0).group), place: (a, at) => context.smelters.use(a, at) });
  def('loom', { recovery: context.looms, tool: 'place', valid: (a, x, z) => context.looms.canPlaceAt(a, x, z), buildPreview: ghost((sc) => new Loom(sc, new THREE.Vector3(), 0).group), place: (a, at) => context.looms.use(a, at) });
  def('researchTable', { recovery: context.researchTables, tool: 'place', valid: (a, x, z) => context.researchTables.canPlaceAt(a, x, z), buildPreview: ghost(sc => new ResearchTable(sc, new THREE.Vector3()).group), place: (a, at) => context.researchTables.place(a, 'researchTable', at) });
  def('mill', { recovery: context.mills, tool: 'place', valid: (a, x, z) => context.mills.canPlaceAt(a, x, z), buildPreview: ghost((sc) => new Mill(sc, new THREE.Vector3(), 0).group), place: (a, at) => context.mills.use(a, at) });
  def('gravelPath', roadFacility(context.gravelPaths, context.terrain));
  def('plankPath', roadFacility(context.plankPaths, context.terrain));
  def('cookingStation', { recovery: context.cookingStations, tool: 'place', valid: (a, x, z) => context.cookingStations.canPlaceAt(a, x, z), buildPreview: ghost((sc) => new CookingStation(sc, new THREE.Vector3(), 0, 0).group), place: (a, at) => context.cookingStations.use(a, at) });
  // 火堆(放下即引燃)/熄灭的火堆
  def('campfire', { recovery: context.campfire, tool: 'place', valid: (a, x, z) => context.campfire.canPlaceAt(a, x, z), buildPreview: ghost((sc) => new Campfire(sc, new THREE.Vector3(), 60).group), place: (a, at) => context.campfire.place(a, 'campfire', at) });
  def('deadCampfire', { recovery: context.campfire, tool: 'place', valid: (a, x, z) => context.campfire.canPlaceAt(a, x, z), buildPreview: ghost((sc) => new Campfire(sc, new THREE.Vector3(), 0).group), place: (a, at) => context.campfire.place(a, 'deadCampfire', at) });
  // 常驻设施：火把与神龛共用设施生命周期，各自负责表现与效果。
  for (const kind of ['poseidonBlessing', 'beehiveShrine', 'healCrystal', 'rainAltar', 'crocIncense', 'torch'] as const) {
    def(kind, {
      recovery: context.shrines,
      tool: 'place',
      valid: (a, x, z) => context.shrines.canPlaceAt(a, x, z),
      buildPreview: ghost((sc) => createAmbientFacility(sc, new THREE.Vector3(), kind).group),
      place: (a, at) => context.shrines.place(a, kind, at),
    });
  }
  // 床/工作台(各等级道具共用对应等级模型)
  const bedLevels: Partial<Record<ResourceKind, number>> = { bed1: 1, bed2: 2, bed3: 3 };
  for (const [kind, level] of Object.entries(bedLevels) as [ResourceKind, number][]) {
    def(kind, {
      recovery: context.beds,
      tool: 'place',
      valid: (a, x, z) => context.beds.canPlaceAt(a, x, z),
      buildPreview: ghost((sc) => new Bed(sc, new THREE.Vector3(), level).group),
      place: (a, at) => context.beds.place(a, level, at),
    });
  }
  const benchLevels: Partial<Record<ResourceKind, number>> = { workbench1: 1, workbench2: 2, workbench3: 3, workbench4: 4 };
  for (const [kind, level] of Object.entries(benchLevels) as [ResourceKind, number][]) {
    def(kind, {
      recovery: context.workbench,
      tool: 'place',
      valid: (a, x, z) => context.workbench.canPlaceAt(a, x, z),
      buildPreview: ghost((sc) => new Workbench(sc, new THREE.Vector3(), level).group),
      place: (a, at) => context.workbench.placeItem(a, level, at),
    });
  }
  // 挖来的丛/蚯蚓窝
  def('berryBush', { recovery: null, tool: 'place', valid: (a, x, z) => context.bushCellOk(a, x, z), buildPreview: () => makeBerryBush().group, place: (a, at) => context.placeBush('berryBush', at, a) });
  def('shrubBush', { recovery: null, tool: 'place', valid: (a, x, z) => context.bushCellOk(a, x, z), buildPreview: () => makeShrub(), place: (a, at) => context.placeBush('shrubBush', at, a) });
  def('grassTuft', { recovery: null, tool: 'place', valid: (a, x, z) => context.bushCellOk(a, x, z), buildPreview: () => makeGrassTuft(), place: (a, at) => context.placeBush('grassTuft', at, a) });
  def('wormNest', { recovery: null, tool: 'place', valid: (a, x, z) => context.bushCellOk(a, x, z), buildPreview: () => makeWormNest().group, place: (a, at) => context.placeBush('wormNest', at, a) });
  // 土壤:手持锄头即触发的零消耗设施,站定自动开出一格土壤(高等级锄头更快),铲子可挖掉还原
  def('soil', soilFacility(context.soils, context.terrain));
  // 树木种子共用设施网格与干地占位规则,预览为真实发芽模型。
  for (const species of TREE_SPECIES) {
    const kind = SEED_OF[species];
    def(kind, {
      recovery: null,
      tool: 'place',
      valid: (a, x, z) => context.bushCellOk(a, x, z),
      buildPreview: makeTreeSproutPreview,
      placementSound: 'plant',
      holdTime: 0.5,
      repeatOnSuccess: true,
      place: (a, at) => context.placeTree(species, at, a),
      placingLabel: `播种:${ITEMS[kind].name}…`,
    });
  }
  // 作物种子:空土壤格连续播种，每颗 0.5 秒，完成后接着播下一格。
  for (const spec of Object.values(CROP_SPECS)) {
    def(spec.seed, {
      recovery: context.soils,
      tool: 'place',
      valid: (a, x, z) => context.crops.canPlantAt(a, x, z),
      buildPreview: () => makeCropSproutPreview(spec.kind),
      placementSound: 'plant',
      holdTime: 0.5,
      repeatOnSuccess: true,
      place: (a, at) => context.crops.plant(a, spec.seed, at),
      placingLabel: `播种:${spec.name}…`,
      failText: () => '种子只能种在空的土壤上,先用锄头开垦',
    });
  }
  // 围栏木/石:落点优先接上现有围栏线,预览横杆按邻居显隐
  for (const [kind, fenceKind] of [['fenceWood', 'branch'], ['fenceStone', 'stone']] as const) {
    def(kind, {
      recovery: context.fences,
      tool: 'fence',
      target: (a) => {
        const t = context.fences.vertexTarget(a);
        return t ? { x: t.gx, z: t.gz, reason: null } : { ...snapAheadCell(a), reason: '附近没有能立围栏柱的格点,挪个位置再试' };
      },
      buildPreview: () => makeFenceGhost(fenceKind),
      handModel: () => makeFenceHandModel(fenceKind),
      onPreview: (preview, _a, x, z) => {
        // 实物围栏不旋转,预览固定朝向,横杆显隐方向才与实际连接一致
        preview.rotation.y = 0;
        context.fences.applyGhost(preview, x, z);
      },
      onPreviewHide: () => context.fences.clearPreviewLinks(),
      place: (a) => context.fences.useFence(a, fenceKind),
      failText: () => '这里放不下,找块没东西的干地正对着要围的方向试试',
    });
  }
  // 围栏门:占一条两格边,落点优先嵌进围栏线缺口,站定自动放置耗时更长
  for (const kind of ['fenceGate', 'stoneGate'] as const) def(kind, {
    recovery: context.fences,
    tool: 'fenceGate',
    holdTime: 5,
    target: (a) => {
      const t = context.fences.gateTarget(a);
      if (!t) return { ...snapAheadCell(a), reason: '附近没有能放门的位置,挪个位置再试' };
      return { x: t.gx + (t.dir === 'x' ? 1 : 0), z: t.gz + (t.dir === 'z' ? 1 : 0), reason: null };
    },
    buildPreview: () => makeGateGhost(kind),
    handModel: () => makeFenceGateHandModel(kind),
    onPreview: (preview, a) => context.fences.applyGateGhost(preview, a),
    onPreviewHide: () => context.fences.clearPreviewLinks(),
    place: (a) => context.fences.useGate(a, kind),
    failText: () => '这里放不下,找块没东西的干地正对着要围的方向试试',
  });
}
