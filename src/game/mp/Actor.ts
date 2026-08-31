import type { Player } from '../entities/Player';
import type { Inventory } from '../systems/Inventory';
import type { SurvivalSystem } from '../systems/SurvivalSystem';
import type { Tools } from '../systems/Crafting';

/** 交互结算的发起者:一名玩家的实体与个人状态(本地/远程会话均实现该接口)。
 * 世界侧系统(火堆/木箱/围栏等)以它为参数,按发起者结算个人进度与背包变动。 */
export interface Actor {
  readonly player: Player;
  readonly inventory: Inventory;
  readonly survival: SurvivalSystem;
  readonly tools: Tools;
}
