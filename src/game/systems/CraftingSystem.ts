import type { Player } from '../entities/Player';
import { craft, type Recipe, type Tools } from './Crafting';
import type { Inventory, ResourceKind } from './Inventory';
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

  constructor(
    private player: Player,
    private inventory: Inventory,
    private tools: Tools,
    private fx: Particles,
    private audio: GameAudio,
    /** 每完成一件产物时回调(产物种类),供装备自动上身等后续处理 */
    private onFinish: (kind: ResourceKind) => void = () => {}
  ) {}

  start(recipe: Recipe, count = 1): boolean {
    if (
      this.recipe ||
      (recipe.tool && this.tools[recipe.tool]) ||
      count < 1 ||
      !this.canAfford(recipe, count)
    ) {
      return false;
    }
    this.recipe = recipe;
    this.queue = recipe.tool ? 1 : count;
    this.totalQueue = this.queue;
    this.timer = 0;
    this.tickTimer = 0;
    return true;
  }

  /** 材料是否够制作指定个数 */
  private canAfford(recipe: Recipe, count: number): boolean {
    return Object.entries(recipe.cost).every(
      ([kind, n]) => this.inventory.count(kind as ResourceKind) >= (n ?? 0) * count
    );
  }

  update(delta: number): void {
    const recipe = this.recipe;
    if (!recipe) return;
    if (this.player.isMoving || this.player.isSwimming) {
      this.cancel();
      return;
    }
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
      craft(recipe, this.inventory, this.tools);
      // 工具制作完成永久拥有并直接拿在手上,材料产物进背包
      if (recipe.tool) this.player.setTool(recipe.tool);
      this.onFinish(recipe.tool ?? recipe.output!);
      this.audio.play('success');
      const p = this.player.group.position.clone();
      p.y += 0.8;
      this.fx.burst(p, recipe.id === 'axe' ? '#7a4f21' : '#8d99a6', 14);
      this.queue -= 1;
      if (this.queue <= 0) {
        this.recipe = null;
      } else {
        this.timer = 0;
        this.tickTimer = 0;
      }
    }
  }

  cancel(): void {
    this.recipe = null;
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
