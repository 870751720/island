import type { Player } from '../entities/Player';
import { craft, isSingleCraft, type CraftId, type Recipe, type Tools } from './Crafting';
import type { Inventory, ResourceKind } from './Inventory';
import type { Equipment, EquipKind } from './Equipment';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';

const CRAFT_TIME = 2.4; // 合成总时长(秒)
const CRAFT_TICK = 0.6; // 每次敲击特效间隔(秒)
const FX_COLOR = '#c9a15c';

/** 定时合成:点击卡片或工作台面板后站定敲打,播放动作与木屑特效,进度走头顶交互圆环;支持一次排队多个,移动/游泳中断,完成一个结算一个 */
export class CraftingSystem {
  private recipe: Recipe | null = null;
  private queue = 0; // 剩余制作个数
  private totalQueue = 0; // 本次排队的总个数
  private timer = 0;
  private tickTimer = 0;
  private working = false;

  constructor(
    private player: Player,
    private inventory: Inventory,
    private tools: Tools,
    private equipment: Equipment,
    private fx: Particles,
    private audio: GameAudio,
    /** 产物入包(背包放不下的部分由该函数负责掉到地上) */
    private give: (kind: ResourceKind, count: number) => number = (k, n) => inventory.add(k, n),
    /** 已制作配方记录(完成时写入,供图鉴标记与存档) */
    private craftedIds: Set<CraftId> = new Set()
  ) {}

  start(recipe: Recipe, count = 1): boolean {
    if (isSingleCraft(recipe)) count = 1;
    if (this.recipe || count < 1 || !this.canMake(recipe) || !this.canAfford(recipe, count)) {
      return false;
    }
    this.recipe = recipe;
    this.queue = recipe.tool ? 1 : count;
    this.totalQueue = this.queue;
    this.timer = 0;
    this.tickTimer = 0;
    return true;
  }

  /** 工具类是否满足前置:未拥有该等级,且二级/三级需先拥有低一级工具 */
  private canMake(recipe: Recipe): boolean {
    if (!recipe.tool) return true;
    const tier = recipe.tier ?? 1;
    return this.tools[recipe.tool] < tier && this.tools[recipe.tool] >= tier - 1;
  }

  /** 材料是否够制作指定个数:背包数量叠加身上穿戴的装备 */
  private canAfford(recipe: Recipe, count: number): boolean {
    const worn = Object.values(this.equipment.snapshot());
    return Object.entries(recipe.cost).every(([kind, n]) => {
      let have = this.inventory.count(kind as ResourceKind);
      if (worn.includes(kind as EquipKind)) have += 1;
      return have >= (n ?? 0) * count;
    });
  }

  update(delta: number): void {
    const recipe = this.recipe;
    if (!recipe) {
      this.endWork();
      return;
    }
    if (this.player.isMoving || this.player.isSwimming) {
      this.cancel();
      this.endWork();
      return;
    }
    this.working = true;
    this.player.setAction('craft');
    this.timer += delta;
    this.tickTimer += delta;
    if (this.tickTimer >= CRAFT_TICK) {
      this.tickTimer -= CRAFT_TICK;
      this.audio.play('knock');
      const p = this.player.group.position.clone();
      p.y += 0.6;
      this.fx.burst(p, FX_COLOR, 5);
    }
    if (this.timer >= CRAFT_TIME) {
      craft(recipe, this.inventory, this.tools, this.give, this.equipment);
      this.craftedIds.add(recipe.id);
      // 工具制作完成永久拥有并直接拿在手上(升级后即时换高一级模型),材料产物进背包
      // 锄头特殊处理:不自动切换,仅刷新等级模型,避免原地误挖刚做的产物/设施
      if (recipe.tool) {
        this.player.setToolTier(recipe.tool, this.tools[recipe.tool]);
        if (recipe.tool !== 'hoe') this.player.setTool(recipe.tool);
      }
      this.audio.play('success');
      const p = this.player.group.position.clone();
      p.y += 0.8;
      this.fx.burst(p, recipe.id === 'axe' ? '#7a4f21' : '#8d99a6', 14);
      this.queue -= 1;
      if (this.queue <= 0) {
        this.recipe = null;
        this.endWork();
      } else {
        this.timer = 0;
        this.tickTimer = 0;
      }
    }
  }

  cancel(): void {
    this.recipe = null;
  }

  /** 结束合成作业时释放一次自己持有的动作(每帧调用,只在边沿生效) */
  private endWork(): void {
    if (!this.working) return;
    this.working = false;
    this.player.releaseAction('craft');
  }

  get isWorking(): boolean {
    return !!this.recipe;
  }

  /** 当前合成进度 0-1(单个物品),未在合成时为 null */
  getProgress(): number | null {
    return this.recipe ? Math.min(this.timer / CRAFT_TIME, 1) : null;
  }

  get currentRecipe(): Recipe | null {
    return this.recipe;
  }

  /** 排队制作的总数与当前第几个(未在合成时均为 0) */
  get queueInfo(): { total: number; current: number } {
    const total = this.recipe ? this.totalQueue : 0;
    return { total, current: total === 0 ? 0 : total - this.queue + 1 };
  }
}
