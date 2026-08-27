import type { Player } from '../entities/Player';
import type { Prop, Props } from '../world/Props';
import { Inventory } from './Inventory';
import type { Tools } from './Crafting';

const COLLECT_RANGE = 1.6;

/** 靠近资源点采集:树需斧子、大石块需镐子,产物进入背包 */
export class CollectSystem {
  private nearby: Prop | null = null;

  constructor(
    private player: Player,
    private props: Props,
    private inventory: Inventory,
    private tools: Tools
  ) {
    // E 键作为桌面端补充操作
    window.addEventListener('keydown', this.onKeyDown);
  }

  update(): void {
    this.nearby = null;
    const p = this.player.group.position;
    for (const prop of this.props.list) {
      if (!prop.ready) continue;
      if (prop.position.distanceTo(p) < COLLECT_RANGE) {
        this.nearby = prop;
        break;
      }
    }
  }

  getNearby() {
    return this.nearby;
  }

  /** 当前是否满足附近资源点的工具要求 */
  canCollect(): boolean {
    const prop = this.nearby;
    if (!prop) return false;
    if (prop.kind === 'tree') return this.tools.axe;
    if (prop.kind === 'rock') return this.tools.pickaxe;
    return true;
  }

  /** 供触屏动作按钮与键盘共用 */
  tryCollect(): void {
    const prop = this.nearby;
    if (!prop || !this.canCollect()) return;
    this.props.harvest(prop);
    switch (prop.kind) {
      case 'tree':
        this.inventory.add('wood', 3);
        break;
      case 'rock':
        this.inventory.add('stone', 2);
        break;
      case 'gravel':
        this.inventory.add('gravel', 2);
        break;
      case 'berry':
        this.inventory.add('berry', 1);
        break;
      case 'shrub':
        this.inventory.add('wood', 1);
        break;
    }
    this.nearby = null;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === 'e') this.tryCollect();
  };

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
