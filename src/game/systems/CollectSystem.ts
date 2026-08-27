import * as THREE from 'three';
import type { Player } from '../entities/Player';
import type { Prop } from '../world/Props';
import { Inventory } from './Inventory';
import { SurvivalSystem } from './SurvivalSystem';

const COLLECT_RANGE = 1.6;

/** 靠近资源点采集;浆果直接食用恢复生存数值 */
export class CollectSystem {
  private nearby: Prop | null = null;

  constructor(
    private player: Player,
    private props: Prop[],
    private inventory: Inventory,
    private survival: SurvivalSystem
  ) {
    // E 键作为桌面端补充操作
    window.addEventListener('keydown', this.onKeyDown);
  }

  update(): void {
    this.nearby = null;
    const p = this.player.group.position;
    for (const prop of this.props) {
      if (prop.harvested) continue;
      if (prop.position.distanceTo(p) < COLLECT_RANGE) {
        this.nearby = prop;
        break;
      }
    }
  }

  getNearby(): Prop | null {
    return this.nearby;
  }

  /** 供触屏动作按钮与键盘共用 */
  tryCollect(): void {
    if (!this.nearby) return;
    const prop = this.nearby;
    prop.harvested = true;
    if (prop.kind === 'tree') {
      this.inventory.add('wood');
      // 砍掉树冠只留树桩
      prop.group.children
        .filter((c) => c instanceof THREE.Mesh)
        .slice(1)
        .forEach((c) => (c.visible = false));
    } else if (prop.kind === 'rock') {
      this.inventory.add('stone');
      prop.group.visible = false;
    } else {
      this.inventory.add('berry');
      this.survival.eatBerry();
      prop.group.children.forEach((c) => (c.visible = false));
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
