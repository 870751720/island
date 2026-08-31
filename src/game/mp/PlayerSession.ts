import { Player } from '../entities/Player';
import { SurvivalSystem } from '../systems/SurvivalSystem';
import { Inventory } from '../systems/Inventory';
import { Equipment } from '../systems/Equipment';
import type { Tools } from '../systems/Crafting';

/** 一名玩家(本地或远程)在权威端拥有的全部个人状态。
 * 世界状态(地形/资源点/掉落物/放置物/动物)由 Game 层共享,不在此列。 */
export class PlayerSession {
  readonly player: Player;
  readonly survival = new SurvivalSystem();
  readonly inventory = new Inventory();
  readonly equipment = new Equipment();
  readonly tools: Tools = { axe: 0, pickaxe: 0, hoe: 0, fishingrod: 0, bow: 0 };

  constructor(player: Player) {
    this.player = player;
  }
}
