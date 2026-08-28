import type { Player } from '../entities/Player';
import { craft, canCraft, type Recipe, type Tools } from './Crafting';
import type { Inventory } from './Inventory';
import type { Particles } from '../fx/Particles';

const CRAFT_TIME = 2.4; // 合成总时长(秒)
const CRAFT_TICK = 0.6; // 每次敲击特效间隔(秒)
const FX_COLOR = '#c9a15c';

/** 定时合成:点击手搓卡片后站定敲打,播放动作与木屑特效,进度走头顶交互圆环;移动/游泳中断,完成才结算材料 */
export class CraftingSystem {
  private recipe: Recipe | null = null;
  private timer = 0;
  private tickTimer = 0;

  constructor(
    private player: Player,
    private inventory: Inventory,
    private tools: Tools,
    private fx: Particles
  ) {}

  start(recipe: Recipe): boolean {
    if (
      this.recipe ||
      (recipe.tool && this.tools[recipe.tool]) ||
      !canCraft(recipe, this.inventory)
    ) {
      return false;
    }
    this.recipe = recipe;
    this.timer = 0;
    this.tickTimer = 0;
    return true;
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
      const p = this.player.group.position.clone();
      p.y += 0.6;
      this.fx.burst(p, FX_COLOR, 5);
    }
    if (this.timer >= CRAFT_TIME) {
      this.recipe = null;
      craft(recipe, this.inventory, this.tools);
      // 工具制作完成直接拿在手上,材料产物进背包
      if (recipe.tool) this.player.setTool(recipe.tool);
      const p = this.player.group.position.clone();
      p.y += 0.8;
      this.fx.burst(p, recipe.id === 'axe' ? '#7a4f21' : '#8d99a6', 14);
    }
  }

  private cancel(): void {
    this.recipe = null;
  }

  get isWorking(): boolean {
    return !!this.recipe;
  }

  /** 当前合成进度 0-1,未在合成时为 null */
  getProgress(): number | null {
    return this.recipe ? Math.min(this.timer / CRAFT_TIME, 1) : null;
  }

  get currentRecipe(): Recipe | null {
    return this.recipe;
  }
}
