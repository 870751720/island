import { Player } from '../entities/Player';
import { SurvivalSystem } from '../systems/SurvivalSystem';
import { Inventory } from '../systems/Inventory';
import { Equipment } from '../systems/Equipment';
import { AmmoStore } from '../systems/Ammo';
import type { CraftId, Tools } from '../systems/Crafting';
import type { CollectSystem } from '../systems/CollectSystem';
import type { CraftingSystem } from '../systems/CraftingSystem';
import type { EatingSystem } from '../systems/EatingSystem';
import type { FishingSystem } from '../systems/FishingSystem';
import type { BowSystem } from '../systems/BowSystem';
import type { SwordSystem } from '../systems/SwordSystem';
import type { LassoSystem } from '../systems/LassoSystem';
import type { SheepMilkSystem } from '../systems/SheepMilkSystem';
import type { WaterSystem } from '../systems/WaterSystem';
import type { RunStats } from '../systems/RunStats';
import type { Actor } from './Actor';
import { PlayerNameTag } from './PlayerNameTag';

/** 一名玩家(本地或远程)在权威端拥有的全部个人状态。
 * 世界状态(地形/资源点/掉落物/放置物/动物)由 Game 层共享,不在此列。
 * 玩家侧交互系统(采集/制作/进食/钓鱼/弓/喝水)每会话独立一份,由 Game 在世界就绪后装配。 */
export class PlayerSession implements Actor {
  /** 联机生命周期内稳定的玩家标识；不随其他玩家加入或离开而变化。 */
  readonly id: string;
  name: string;
  readonly nameTag: PlayerNameTag;
  readonly player: Player;
  readonly survival = new SurvivalSystem();
  readonly inventory = new Inventory();
  readonly equipment = new Equipment();
  /** 弹药(箭/鱼饵):不进背包的独立持有物,工具按钮角标展示数量 */
  readonly ammo = new AmmoStore();
  readonly tools: Tools = { axe: 0, pickaxe: 0, shovel: 0, hoe: 0, fishingrod: 0, bow: 0, sword: 0 };
  /** 已制作过的配方 id(图鉴「已制作」标记与工作台列表展示用) */
  readonly craftedIds: Set<CraftId> = new Set();
  /** 本局战绩计数(击杀/采集),权威端累计,单机入档 */
  readonly stats: RunStats = { kills: 0, collected: 0 };
  collect!: CollectSystem;
  crafting!: CraftingSystem;
  eating!: EatingSystem;
  fishing!: FishingSystem;
  archery!: BowSystem;
  sword!: SwordSystem;
  lasso!: LassoSystem;
  milk!: SheepMilkSystem;
  water!: WaterSystem;
  /** 上次记录的血量(检测血量下降触发受击表现) */
  lastHealth = 100;
  /** 受击音效间隔节流(持续掉血不成串响) */
  hurtSoundTimer = 0;
  /** 上次记录的死亡状态(检测死亡沿触发倒地与清档) */
  lastDead = false;
  /** 联机死亡后的重生倒计时（秒）；0 表示无需重生。 */
  respawnLeft = 0;
  /** 权威端的放箭动画剩余时长(客人射箭由客人本地判定,房主只补动作快照) */
  shotAnimLeft = 0;
  /** 治愈水晶光环的回血累计(满 10 秒结算 1 血) */
  healTick = 0;
  /** 权威端累计的连续闲置时长:满 IDLE_HIDE_DELAY 后该玩家的 HUD 淡出(本地与远程会话各自计时) */
  hudIdleTime = 0;

  constructor(player: Player, id = crypto.randomUUID(), name = '岛友') {
    this.player = player;
    this.id = id;
    this.name = name;
    this.nameTag = new PlayerNameTag(player.group, name);
  }

  setName(name: string): void {
    this.name = name.trim().slice(0, 8) || '岛友';
    this.nameTag.setName(this.name);
  }
}
