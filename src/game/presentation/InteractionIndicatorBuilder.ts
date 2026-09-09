import type { PlayerSession } from '../mp/PlayerSession';
import type { HudSnapshot } from '../GameContracts';
import { AUTO_EQUIP_DELAY } from '../GameConfig';
import type { AutoPlaceSystem } from '../systems/AutoPlace';
import type { BaitBarrelSystem } from '../systems/BaitBarrelSystem';
import type { BedSystem } from '../systems/BedSystem';
import type { BrewBarrelSystem } from '../systems/BrewBarrelSystem';
import type { CampfireSystem } from '../systems/CampfireSystem';
import type { CookingStationSystem } from '../systems/CookingStationSystem';
import type { CrateSystem } from '../systems/CrateSystem';
import type { FenceSystem } from '../systems/FenceSystem';
import type { LoomSystem } from '../systems/LoomSystem';
import type { RabbitBurrowSystem } from '../systems/RabbitBurrowSystem';
import type { ShrineSystem } from '../systems/ShrineSystem';
import type { SoilSystem } from '../systems/SoilSystem';
import type { SmelterSystem } from '../systems/SmelterSystem';
import type { WorkbenchSystem } from '../systems/WorkbenchSystem';
import { ITEMS } from '../systems/Items';
import { isWineKind } from '../systems/Wine';

type IndicatorSystems = {
  workbench: WorkbenchSystem;
  crates: CrateSystem;
  baitBarrels: BaitBarrelSystem;
  brewBarrels: BrewBarrelSystem;
  burrows: RabbitBurrowSystem;
  smelters: SmelterSystem;
  cookingStations: CookingStationSystem;
  looms: LoomSystem;
  autoPlace: AutoPlaceSystem;
  fences: FenceSystem;
  beds: BedSystem;
  shrines: ShrineSystem;
  soils: SoilSystem;
  campfire: CampfireSystem;
};

/** 按既定优先级将会话和设施状态归并为头顶交互提示。 */
export class InteractionIndicatorBuilder {
  constructor(private readonly systems: IndicatorSystems) {}

  build(session: PlayerSession, isLocal: boolean, autoEquipTimer: number): HudSnapshot['indicator'] {
    const systems = this.systems;
    const nearby = session.collect.getNearby();
    let label: string | null = null;
    let progress: number | null = null;
    let color: string | undefined;
    if (session.survival.state.dead) {
      // 死亡时不显示。
    } else if (session.milk.isWorking) {
      label = '挤羊奶…';
      progress = session.milk.getProgress();
    } else if (session.crafting.isWorking) {
      const { total, current } = session.crafting.queueInfo;
      label = `制作中:${session.crafting.currentRecipe!.name}${total > 1 ? ` ${current}/${total}` : ''}`;
      progress = session.crafting.getProgress();
    } else if (systems.workbench.isUpgrading(session)) {
      label = '升级中:工作台'; progress = systems.workbench.getProgress(session);
    } else if (systems.workbench.isDigging(session)) {
      label = '挖工作台…'; progress = systems.workbench.getDigProgress(session);
    } else if (systems.crates.isDigging(session)) {
      label = systems.crates.diggingKind(session) === 'ironCrate' ? '挖铁箱…' : '挖木箱…';
      progress = systems.crates.getDigProgress(session);
    } else if (systems.baitBarrels.isDigging(session)) {
      label = '挖饵料桶…'; progress = systems.baitBarrels.getDigProgress(session);
    } else if (systems.brewBarrels.isDigging(session)) {
      label = '挖酿酒桶…'; progress = systems.brewBarrels.getDigProgress(session);
    } else if (systems.burrows.isDigging(session)) {
      label = '挖兔子洞…'; progress = systems.burrows.getDigProgress(session);
    } else if (systems.smelters.isDigging(session)) {
      label = '挖冶炼炉…'; progress = systems.smelters.getDigProgress(session);
    } else if (systems.cookingStations.isDigging(session)) {
      label = '挖烹饪台…'; progress = systems.cookingStations.getDigProgress(session);
    } else if (systems.cookingStations.isRoasting(session)) {
      const { total, current } = systems.cookingStations.roastInfo(session);
      const food = ITEMS[systems.cookingStations.roastingKind(session)!];
      label = `烤制中:${food.icon} ${food.name} ${current}/${total}`;
      progress = systems.cookingStations.getProgress(session);
    } else if (systems.looms.isDigging(session)) {
      label = '挖纺织机…'; progress = systems.looms.getDigProgress(session);
    } else if (systems.autoPlace.isPlacing(session)) {
      const kind = systems.autoPlace.heldKind(session);
      const def = kind ? systems.autoPlace.defOf(kind) : undefined;
      const name = def?.name ?? (kind && kind in ITEMS ? ITEMS[kind as keyof typeof ITEMS].name : '');
      label = `安放:${name}…`;
      progress = systems.autoPlace.getPlaceProgress(session);
    } else if (systems.autoPlace.heldKind(session) !== null) {
      label = systems.autoPlace.placeReason(session);
    } else if (systems.fences.isDigging(session)) {
      label = '拆围栏…'; progress = systems.fences.getDigProgress(session);
    } else if (systems.beds.isSleeping(session)) {
      label = '睡觉中…'; progress = systems.beds.getSleepProgress(session);
    } else if (systems.beds.isDigging(session)) {
      label = '挖床…'; progress = systems.beds.getDigProgress(session);
    } else if (systems.shrines.isDigging(session)) {
      label = '拆神像…'; progress = systems.shrines.getDigProgress(session);
    } else if (systems.soils.isDigging(session)) {
      label = '挖土壤…'; progress = systems.soils.getDigProgress(session);
    } else if (systems.campfire.isDigging(session)) {
      label = '挖火堆…'; progress = systems.campfire.getDigProgress(session);
    } else if (systems.campfire.isCooking(session)) {
      const { total, current } = systems.campfire.cookInfo(session);
      const food = ITEMS[systems.campfire.cookingKind(session)!];
      label = `烹饪中:${food.icon} ${food.name} ${current}/${total}`;
      progress = systems.campfire.getProgress(session);
    } else if (session.eating.isWorking) {
      const food = session.eating.currentFood!;
      label = `${food.icon} ${isWineKind(food.kind) ? '喝' : '吃'}${food.name}`;
      progress = session.eating.getProgress();
    } else if (session.fishing.isWorking) {
      const state = session.fishing.currentState!;
      const tease = session.fishing.getTease();
      label = state === 'casting' ? '抛竿…'
        : state === 'waiting' ? tease?.text ?? '等待上钩…'
        : state === 'bite' ? session.fishing.biteNeed > 1
          ? `咬钩了!快连点屏幕!${session.fishing.biteClicks}/${session.fishing.biteNeed}`
          : '咬钩了!快点击屏幕!'
        : state === 'treasure' ? '转珍宝转盘中…' : '收线…';
      progress = session.fishing.getProgress();
      color = tease?.color;
    } else if (nearby && session.collect.canCollect(nearby)) {
      progress = session.collect.getHarvestInfo()?.progress ?? null;
      const digging = session.player.currentTool === 'shovel';
      label = session.collect.isPickingFruit(nearby) ? '摘果子'
        : nearby.kind === 'tree' ? '砍树'
        : nearby.kind === 'iron' ? '采铁'
        : nearby.kind === 'rock' || nearby.kind === 'meteor' ? '采石'
        : nearby.kind === 'gravel' ? '捡石头'
        : nearby.kind === 'shrub' ? digging ? '挖灌木丛' : '捡树枝'
        : nearby.kind === 'grass' ? digging ? '挖草丛' : '采纤维'
        : nearby.kind === 'wormNest' ? digging ? '挖蚯蚓窝' : '捉蚯蚓'
        : digging ? '挖浆果丛' : '采浆果';
    } else if (session.water.isActive) {
      label = '喝水'; progress = session.water.getProgress();
    } else if (isLocal && autoEquipTimer > 0 && !nearby) {
      label = '切换鱼竿…'; progress = autoEquipTimer / AUTO_EQUIP_DELAY;
    } else if (nearby) {
      const switching = isLocal && autoEquipTimer > 0;
      label = nearby.kind === 'tree'
        ? switching ? '切换斧子…' : session.tools.axe ? null : '需要斧子'
        : nearby.kind === 'iron'
          ? switching ? '切换镐子…' : session.tools.pickaxe >= 2 ? null : '需要石镐'
          : nearby.kind === 'rock'
            ? switching ? '切换镐子…' : session.tools.pickaxe ? null : '需要镐子'
            : nearby.kind === 'meteor'
              ? switching ? '切换镐子…' : session.tools.pickaxe >= 3 ? null : '需要铁镐'
              : null;
      if (switching) progress = autoEquipTimer / AUTO_EQUIP_DELAY;
    }
    return { label, progress, color };
  }
}
