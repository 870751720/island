import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import { MoveInput } from '../core/MoveInput';
import { IslandTerrain } from '../world/IslandTerrain';
import type { WaterFx } from '../fx/WaterFx';
import type { Footprints } from '../fx/Footprints';
import type { EquipKind, EquipSlot } from '../systems/Equipment';
import { GmSystem } from '../systems/GmSystem';
import { InjuryFx } from '../fx/InjuryFx';
import { createPlayerModel, type PlayerGender } from './PlayerModel';
import { SwordTrail } from '../fx/SwordTrail';
import { PlayerAnimator } from './PlayerAnimator';
import { PlayerWardrobe } from './equipment/PlayerWardrobe';

const MOVE_SPEED = 5;
/** 每走多远留一枚脚印(约一步) */
const STEP_DISTANCE = 0.55;
const SWIM_SPEED = 2.6;
/** 水深超过该值才进入游泳(更浅处涉水,水可漫过裤腿);裤腿高约 0.55 */
const SWIM_DEPTH = 0.6;
const HURT_FLASH_TIME = 0.35;
/** 玩家碰撞半径(与树、大石等静态阻挡做圆形推挤) */
const PLAYER_RADIUS = 0.35;

/** 静态阻挡解算器:把实体位置推出有阻挡的物件 */
export interface ObstacleSolver {
  resolveCollision(p: THREE.Vector3, radius: number): void;
}

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 1,
  });
}

/** 作业动画类型:砍树/凿石/拾取/喝水/钓鱼(抛竿/持竿)/挥剑 */
export type ActionType =
  | 'chop'
  | 'mine'
  | 'pick'
  | 'drink'
  | 'craft'
  | 'cook'
  | 'eat_berry'
  | 'eat_fish'
  | 'cast'
  | 'fish'
  | 'shoot'
  | 'slash'
  | 'sleep';

/** 手持工具:空手/斧子/镐子/铲子/锄头/鱼竿/弓/木剑/套索(套羊)/围栏(木/石通用)与围栏门(用于沿途立栏)/安放(可放置道具通用) */
export type HandTool =
  | 'hand'
  | 'axe'
  | 'pickaxe'
  | 'shovel'
  | 'hoe'
  | 'fishingrod'
  | 'bow'
  | 'sword'
  | 'lasso'
  | 'fence'
  | 'fenceGate'
  | 'place';

function makeFishingRodModel(tier: 1 | 2 | 3): THREE.Group {
  // 鱼竿:细长树枝;竿梢挂一个空锚点,钓鱼时钓线从竿梢连到浮漂
  // 二级(木鱼竿):竿身更直更粗,柄部缠绳线;三级(铁鱼竿):金属竿身 + 绳柄
  const g = new THREE.Group();
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.04, 0.85, 5),
    clayMaterial(tier === 3 ? '#aab2ba' : '#8a6239')
  );
  g.add(rod);
  if (tier >= 2) {
    rod.rotation.z = 0.04;
    const grip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.16, 5),
      clayMaterial('#c9b588')
    );
    grip.position.y = -0.32;
    g.add(grip);
  }
  const tip = new THREE.Object3D();
  tip.position.set(0.035, 0.42, 0);
  g.add(tip);
  g.userData.tip = tip;
  g.rotation.x = Math.PI / 2.4;
  return g;
}

function makeAxeModel(tier: 1 | 2 | 3): THREE.Group {
  // 一级(木斧):树枝柄 + 绑上去的小石刃;二级(石斧):更大的磨制石刃 + 绑绳;三级(铁斧):铁刃更宽
  const g = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 0.6, 5),
    clayMaterial('#8a6239')
  );
  const big = tier >= 2;
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, big ? 0.28 : 0.2, tier === 3 ? 0.26 : big ? 0.2 : 0.14),
    clayMaterial(tier === 3 ? '#aab2ba' : big ? '#7d7d82' : '#9a9a9a')
  );
  blade.position.set(0, big ? 0.28 : 0.25, big ? 0.12 : 0.09);
  g.add(handle, blade);
  if (big) {
    const binding = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.05, 5),
      clayMaterial('#c9b588')
    );
    binding.position.set(0, 0.24, 0.02);
    g.add(binding);
  }
  g.rotation.x = Math.PI / 2.4;
  return g;
}

function makeBowModel(tier: 1 | 2 | 3): THREE.Group {
  // 弓:细杆弯成弓形(用弧形排布的短柱近似)+ 一根弓弦
  // 二级(木弓):弓臂更粗,中段缠绳握把;三级(铁弓):金属弓臂
  const g = new THREE.Group();
  const branch = clayMaterial(tier === 3 ? '#aab2ba' : '#8a6239');
  const r = tier >= 2 ? 0.028 : 0.02;
  const segments = 7;
  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.14, 4), branch);
    seg.position.set(0, (t - 0.5) * 0.78, Math.sin(t * Math.PI) * 0.1 - 0.1);
    seg.rotation.x = -Math.cos(t * Math.PI) * 0.5;
    g.add(seg);
  }
  const string = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.78, 3),
    new THREE.MeshBasicMaterial({ color: '#f5f2e8' })
  );
  string.position.set(0, 0, -0.1);
  g.add(string);
  if (tier >= 2) {
    const grip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.14, 5),
      clayMaterial('#c9b588')
    );
    grip.position.set(0, 0, -0.06);
    g.add(grip);
  }
  g.rotation.x = Math.PI / 2.4;
  return g;
}

function makePickaxeModel(tier: 1 | 2 | 3): THREE.Group {
  // 一级(木镐):树枝柄 + 小镐头;二级(石镐):更长更尖的磨制镐头 + 绑绳;三级(铁镐):铁镐头
  const g = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 0.6, 5),
    clayMaterial('#8a6239')
  );
  const big = tier >= 2;
  const stone = clayMaterial(tier === 3 ? '#aab2ba' : big ? '#7d7d82' : '#8a8a8a');
  const len = tier === 3 ? 0.68 : big ? 0.6 : 0.5;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.05, big ? 0.1 : 0.08, len), stone);
  head.position.y = 0.27;
  const tipL = new THREE.Mesh(new THREE.ConeGeometry(big ? 0.06 : 0.05, big ? 0.18 : 0.14, 4), stone);
  tipL.rotation.z = Math.PI / 2;
  tipL.position.set(0, 0.27, -len / 2);
  const tipR = tipL.clone();
  tipR.rotation.z = -Math.PI / 2;
  tipR.position.z = len / 2;
  g.add(handle, head, tipL, tipR);
  if (big) {
    const binding = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.05, 5),
      clayMaterial('#c9b588')
    );
    binding.position.y = 0.25;
    g.add(binding);
  }
  g.rotation.x = Math.PI / 2.4;
  return g;
}

/** 铲子:木柄 + 顶端同轴铲斗,握在右手;一级木铲、二级石铲、三级铁铲(铲斗更宽) */
function makeShovelModel(tier: 1 | 2 | 3): THREE.Group {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 0.62, 5),
    clayMaterial('#8a6239')
  );
  const bladeColor = tier === 3 ? '#aab2ba' : tier === 2 ? '#7d7d82' : '#8a8266';
  const bladeMat = clayMaterial(bladeColor);
  const width = tier === 3 ? 0.16 : tier === 2 ? 0.14 : 0.12;
  // 铲斗:与柄同轴的扁圆锥壳,扣在柄顶端
  const scoop = new THREE.Mesh(new THREE.ConeGeometry(width, 0.26, 5, 1, true), bladeMat);
  scoop.scale.z = 0.4;
  scoop.rotation.y = Math.PI / 5;
  scoop.position.y = 0.42;
  const socket = new THREE.Mesh(new THREE.BoxGeometry(width * 1.1, 0.1, 0.06), bladeMat);
  socket.position.y = 0.27;
  g.add(handle, scoop, socket);
  g.rotation.x = Math.PI / 2.4;
  return g;
}

/** 锄头:木柄 + 顶端横向扁刃(与柄垂直,锄地时切土);一级木锄、二级石锄、三级铁锄(刃更宽) */
function makeHoeModel(tier: 1 | 2 | 3): THREE.Group {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.045, 0.62, 5),
    clayMaterial('#8a6239')
  );
  const bladeColor = tier === 3 ? '#aab2ba' : tier === 2 ? '#7d7d82' : '#9a8a72';
  const bladeMat = clayMaterial(bladeColor);
  const width = tier === 3 ? 0.22 : tier === 2 ? 0.18 : 0.14;
  // 锄刃:横在柄顶的扁方块,朝向与柄垂直
  const blade = new THREE.Mesh(new THREE.BoxGeometry(width, 0.07, 0.12), bladeMat);
  blade.position.y = 0.36;
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.06), bladeMat);
  neck.position.y = 0.29;
  g.add(handle, blade, neck);
  g.rotation.x = Math.PI / 2.4;
  return g;
}

/** 剑:木柄 + 十字护手 + 扁剑身;一级(木剑)木色剑身,二级(石剑)更短的磨石剑身,三级(铁剑)铁色长剑身 */
function makeSwordModel(tier: 1 | 2 | 3): THREE.Group {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.04, 0.16, 5),
    clayMaterial('#8a6239')
  );
  handle.position.y = -0.06;
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.05), clayMaterial('#a97b48'));
  guard.position.y = 0.03;
  const bladeMat = clayMaterial(tier === 3 ? '#aab2ba' : tier === 2 ? '#7d7d82' : '#d9c27a');
  const bladeLen = tier === 3 ? 0.5 : tier === 2 ? 0.38 : 0.46;
  const bladeWidth = tier === 1 ? 0.06 : 0.075;
  const blade = new THREE.Mesh(new THREE.BoxGeometry(bladeWidth, bladeLen, tier === 1 ? 0.02 : 0.03), bladeMat);
  blade.position.y = 0.03 + bladeLen / 2;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(tier === 1 ? 0.042 : 0.052, 0.1, 4), bladeMat);
  tip.position.y = 0.03 + bladeLen + 0.04;
  g.add(handle, guard, blade, tip);
  g.rotation.x = Math.PI / 2.4;
  return g;
}

/** 手持套索:握把绕着盘起的绳圈,绳头甩出一个活结绳套 */
function makeLassoModel(): THREE.Group {
  const g = new THREE.Group();
  const mat = clayMaterial('#c9b588');
  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.035, 0.14, 5),
    clayMaterial('#8a6239')
  );
  g.add(grip);
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.032, 5, 10), mat);
  coil.rotation.x = Math.PI / 2;
  coil.position.y = 0.1;
  g.add(coil);
  const lead = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 4), mat);
  lead.position.set(0.1, 0.1, 0);
  lead.rotation.z = Math.PI / 2 - 0.3;
  g.add(lead);
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 5, 10), mat);
  loop.position.set(0.2, 0.14, 0);
  loop.rotation.y = Math.PI / 2;
  g.add(loop);
  g.rotation.x = Math.PI / 2.4;
  return g;
}

/** 手持围栏/门:一小捆柱子和横杆(按种类区分颜色) */
/** 程序拼装的低多边形小人 + 运行时走路/作业动画 */
export class Player implements Updatable {
  readonly group = new THREE.Group();
  readonly input: MoveInput;
  private terrain: IslandTerrain;
  private animator: PlayerAnimator;
  private swordTrail: SwordTrail;
  private swimHead = new THREE.Vector3();
  private arms: THREE.Group[] = [];
  private legs: THREE.Group[] = [];
  private moveVec = new THREE.Vector2();
  private moving = false;
  private stepDistance = 0;
  private stepLeft = false;
  private swimming = false;
  private wading = false;
  private action: ActionType | null = null;
  /** 当前动作已进行时长(射箭等需要按进度摆姿态的动作用) */
  private actionTime = 0;
  private hurtFlash = 0;
  /** 减速 debuff 剩余时长(熊扑击命中时施加) */
  private slowLeft = 0;
  /** 「舒爽」增益剩余时长(喝酒获得,移动加速) */
  private refreshLeft = 0;
  /** 「晕晕的」状态剩余时长(舒爽时再喝酒转为,减速但增伤) */
  private tipsyLeft = 0;
  private handTool: HandTool = 'hand';
  /** 每件工具按等级的模型(下标 = 等级 - 1;铲子/围栏只有 1 级) */
  private placeMount: THREE.Group;
  private toolModels: Partial<Record<Exclude<HandTool, 'hand'>, THREE.Group[]>> = {};
  /** 各工具当前等级(缺省 1),决定展示哪一档模型 */
  private toolTiers: Partial<Record<Exclude<HandTool, 'hand'>, number>> = {};
  private obstacles: ObstacleSolver[] = [];
  /** 躺床睡觉的目标姿态(非空表示睡着:位置/朝向由睡眠姿态接管) */
  private sleepPose: { pos: THREE.Vector3; rotY: number; returnPos: THREE.Vector3 } | null = null;
  /** 已死亡:倒地姿态接管,忽略一切输入 */
  private dead = false;
  /** 遥控玩家(联机时的其他玩家):不读本地输入,姿态由网络快照驱动 */
  private readonly remote: boolean;
  /** 遥控目标姿态:位置向它插值,移动感由距离推出(用于走路动画) */
  private netPos = new THREE.Vector3();
  private netRotY = 0;
  /** 持续受伤外观(伤口贴片/血滴),由 setHealth 喂入的血量驱动 */
  private injuryFx!: InjuryFx;
  /** 当前血量(仅作受伤表现驱动,权威值在 SurvivalSystem/快照) */
  private health = 100;
  private wardrobe: PlayerWardrobe;
  private gender: PlayerGender = 'boy';
  private appearance: ReturnType<typeof createPlayerModel>;

  /** 注入静态阻挡(树、大石、围栏等),移动时被推出不可穿越的物件 */
  setObstacles(...obstacles: ObstacleSolver[]): void {
    this.obstacles = obstacles;
  }

  constructor(
    terrain: IslandTerrain,
    spawn: THREE.Vector3,
    private waterFx: WaterFx,
    private footprints: Footprints,
    options: { remote?: boolean; keyboard?: boolean } = {}
  ) {
    this.terrain = terrain;
    this.remote = !!options.remote;
    // 遥控玩家不读输入;房主端的远程会话保留本地物理但要屏蔽键盘,只吃网络摇杆
    this.input = new MoveInput(options.keyboard ?? !this.remote);

    const model = createPlayerModel();
    this.appearance = model;
    const { arms, legs } = model;
    const handR = model.elbows[1];
    this.group.add(model.root);
    this.wardrobe = new PlayerWardrobe(model);
    this.animator = new PlayerAnimator(model);
    this.swordTrail = new SwordTrail(this.group);
    this.arms = arms;
    this.legs = legs;
    this.injuryFx = new InjuryFx({
      torso: model.torso, armL: model.armSurfaces[0], legL: model.legSurfaces[0],
    });

    // 工具握在右前臂末端;可升级工具各备一二三级三套模型
    const tiers: Array<[Exclude<HandTool, 'hand'>, THREE.Group[]]> = [
      ['axe', [makeAxeModel(1), makeAxeModel(2), makeAxeModel(3)]],
      ['pickaxe', [makePickaxeModel(1), makePickaxeModel(2), makePickaxeModel(3)]],
      ['shovel', [makeShovelModel(1), makeShovelModel(2), makeShovelModel(3)]],
      ['hoe', [makeHoeModel(1), makeHoeModel(2), makeHoeModel(3)]],
      ['fishingrod', [makeFishingRodModel(1), makeFishingRodModel(2), makeFishingRodModel(3)]],
      ['bow', [makeBowModel(1), makeBowModel(2), makeBowModel(3)]],
      ['sword', [makeSwordModel(1), makeSwordModel(2), makeSwordModel(3)]],
      ['lasso', [makeLassoModel()]],
    ];
    for (const [tool, models] of tiers) {
      for (const t of models) {
        t.position.set(-0.006, -0.18, 0.05);
        if (tool === 'fishingrod') {
          t.position.y += Math.cos(Math.PI / 2.4) * 0.3;
          t.position.z += Math.sin(Math.PI / 2.4) * 0.3;
        }
        t.visible = false;
      }
      handR.add(...models);
    }
    this.toolModels = Object.fromEntries(tiers);

    // 安放/围栏/围栏门工具手持的是当前道具的缩小模型,由外层按选中道具替换
    this.placeMount = new THREE.Group();
    this.placeMount.position.set(-0.006, -0.18, 0.05);
    this.placeMount.rotation.x = Math.PI / 2.4;
    this.placeMount.visible = false;
    handR.add(this.placeMount);

    // 先绕世界 Y 轴朝向,再前倾,游泳时转向才正确
    this.group.rotation.order = 'YXZ';
    this.group.position.copy(spawn);
  }

  get isMoving(): boolean {
    return this.moving;
  }

  get isSwimming(): boolean {
    return this.swimming;
  }

  get currentTool(): HandTool {
    return this.handTool;
  }

  /** 手里正举着可放置道具(安放/围栏/围栏门),双手被占用,其余站定交互一律让位 */
  get holdsFacility(): boolean {
    return this.handTool === 'place' || this.handTool === 'fence' || this.handTool === 'fenceGate';
  }

  /** 切换手持工具(仅视觉,不影响采集资格) */
  setTool(tool: HandTool): void {
    this.handTool = tool;
    this.refreshToolModels();
  }

  /** 更新工具等级(升级/读档/快照对账),正持有时即时换模型 */
  setToolTier(tool: Exclude<HandTool, 'hand'>, tier: number): void {
    this.toolTiers[tool] = tier;
    if (this.handTool === tool) this.refreshToolModels();
  }

  /** 替换安放工具手里的道具模型(传 null 清空);仅手持安放工具且有模型时显示 */
  setPlaceModel(model: THREE.Object3D | null): void {
    this.placeMount.clear();
    if (model) this.placeMount.add(model);
    this.refreshToolModels();
  }

  /** 按当前手持与等级刷新工具模型显隐 */
  private refreshToolModels(): void {
    for (const [name, models] of Object.entries(this.toolModels) as Array<
      [Exclude<HandTool, 'hand'>, THREE.Group[]]
    >) {
      const tier = Math.min(this.toolTiers[name] ?? 1, models.length) - 1;
      models.forEach((m, i) => (m.visible = name === this.handTool && i === tier));
    }
    this.placeMount.visible =
      (this.handTool === 'place' || this.handTool === 'fence' || this.handTool === 'fenceGate') &&
      this.placeMount.children.length > 0;
  }

  get currentGender(): PlayerGender {
    return this.gender;
  }

  setGender(gender: PlayerGender): void {
    if ((gender !== 'boy' && gender !== 'girl') || gender === this.gender) return;
    this.gender = gender;
    this.appearance.setGender(gender);
    this.wardrobe.setGender(gender);
  }

  /** 本地穿戴与联机快照共用的装备外观入口。 */
  setEquip(slot: EquipSlot, kind: EquipKind | null): void {
    this.wardrobe.setEquip(slot, kind);
  }

  /** 手持鱼竿时取竿梢世界坐标(钓线起点),未持竿返回 false */
  getRodTip(out: THREE.Vector3): boolean {
    const rods = this.toolModels.fishingrod;
    if (!rods || this.handTool !== 'fishingrod') return false;
    const rod = rods[Math.min(this.toolTiers.fishingrod ?? 1, rods.length) - 1];
    (rod.userData.tip as THREE.Object3D).getWorldPosition(out);
    return true;
  }

  setAction(action: ActionType | null): void {
    if (action !== this.action) {
      this.action = action;
      this.actionTime = 0;
    }
  }

  /** 只在该动作仍由调用方持有时清掉,避免抹掉同帧被剑/弓等其他系统接管的动作。 */
  releaseAction(action: ActionType): void {
    if (this.action === action) this.setAction(null);
  }

  /** 是否处于作业动画中(砍树/凿石/制作/吃喝/钓鱼等交互动作) */
  get isActing(): boolean {
    return this.action !== null;
  }

  /** 当前作业动作，供联机姿态快照同步。 */
  get currentAction(): ActionType | null {
    return this.action;
  }

  get isSleeping(): boolean {
    return this.sleepPose !== null;
  }

  /** 躺到床上睡(pos 为脚跟落点、rotY 为躺平朝向),起身时回到原位 */
  setSleeping(pos: THREE.Vector3, rotY: number): void {
    this.sleepPose = { pos: pos.clone(), rotY, returnPos: this.group.position.clone() };
    this.action = null;
    this.group.rotation.y = rotY;
    for (const model of Object.values(this.toolModels).flat()) model.visible = false;
    this.placeMount.visible = false;
  }

  /** 起床:回到入睡前的站位并站直 */
  wakeUp(): void {
    if (!this.sleepPose) return;
    this.group.position.copy(this.sleepPose.returnPos);
    this.group.rotation.x = 0;
    this.sleepPose = null;
  }

  /** 受击反馈:模型短暂泛红(通过 emissive 衰减实现) */
  hurt(): void {
    this.hurtFlash = HURT_FLASH_TIME;
  }

  /** 写入当前血量,驱动伤口/血滴等持续受伤表现(本地权威值或客人快照值) */
  setHealth(health: number): void {
    this.health = health;
  }

  /** 死亡:取消作业/睡眠姿态并倒地,之后不再响应输入 */
  setDead(): void {
    this.dead = true;
    this.action = null;
    this.sleepPose = null;
    for (const model of Object.values(this.toolModels).flat()) model.visible = false;
    this.placeMount.visible = false;
  }

  /** 从死亡姿态恢复站立，并传送到出生点。 */
  respawn(spawn: THREE.Vector3): void {
    this.dead = false;
    this.action = null;
    this.sleepPose = null;
    this.moving = false;
    this.swimming = false;
    this.wading = false;
    this.slowLeft = 0;
    this.refreshLeft = 0;
    this.tipsyLeft = 0;
    this.group.position.copy(spawn);
    this.group.rotation.set(0, 0, 0);
    this.animator.reset();
    this.swordTrail.clear();
    this.setTool('hand');
  }

  /** 减速 debuff:被熊扑中时施加,期间移动速度减半 */
  applySlow(duration: number): void {
    this.slowLeft = Math.max(this.slowLeft, duration);
  }

  /** 减速剩余秒数(供 buff 展示),0 表示未被减速 */
  get slowSeconds(): number {
    return this.slowLeft;
  }

  /** 喝酒:舒爽状态下再喝转为「晕晕的」,否则获得「舒爽」 */
  applyWine(refreshDuration: number, tipsyDuration: number): void {
    if (this.refreshLeft > 0) {
      this.refreshLeft = 0;
      this.tipsyLeft = Math.max(this.tipsyLeft, tipsyDuration);
    } else {
      this.tipsyLeft = 0;
      this.refreshLeft = Math.max(this.refreshLeft, refreshDuration);
    }
  }

  /** 舒爽增益剩余秒数,0 表示未生效 */
  get refreshSeconds(): number {
    return this.refreshLeft;
  }

  /** 晕晕的状态剩余秒数,0 表示未生效 */
  get tipsySeconds(): number {
    return this.tipsyLeft;
  }

  /** 遥控/客人本地玩家:按权威快照对齐酒意计时(差值超过阈值才改写,避免快照延迟来回抖动) */
  netSyncWine(refresh: number, tipsy: number): void {
    if (Math.abs(refresh - this.refreshLeft) > 1) this.refreshLeft = refresh;
    if (Math.abs(tipsy - this.tipsyLeft) > 1) this.tipsyLeft = tipsy;
  }

  /** 遥控玩家:写入网络快照给出的目标姿态(本地玩家忽略) */
  setNetPose(x: number, y: number, z: number, rotY: number): void {
    if (!this.remote) return;
    this.netPos.set(x, y, z);
    this.netRotY = rotY;
  }

  update(delta: number, elapsed: number): void {
    // 受击泛红:每帧按剩余时间衰减,结束后归零还原
    if (this.hurtFlash > 0) {
      this.hurtFlash = Math.max(0, this.hurtFlash - delta);
      const k = this.hurtFlash / HURT_FLASH_TIME;
      this.group.traverse((o) => {
        const mat = (o as THREE.Mesh).material;
        if (mat instanceof THREE.MeshStandardMaterial) mat.emissive.setRGB(0.9 * k, 0.05 * k, 0.03 * k);
      });
    }
    // 持续受伤表现先于一切姿态更新,倒地/睡眠时伤口血滴仍在
    this.injuryFx.update(delta, this.health);
    if (this.dead) {
      this.updateDead(delta);
      return;
    }
    if (this.sleepPose) {
      this.updateSleep(delta, elapsed);
      return;
    }
    if (!this.remote) {
      this.input.getVector(this.moveVec);
      this.moving = this.moveVec.lengthSq() > 0.001;
    }

    const p = this.group.position;
    const previousX = p.x;
    const previousZ = p.z;
    const groundY = this.terrain.getHeight(p.x, p.z);
    const waterY = this.terrain.getWaterLevel(p.x, p.z);
    const wasSwimming = this.swimming;
    this.swimming = groundY < waterY - SWIM_DEPTH;
    if (this.swimming !== wasSwimming) this.waterFx.splash(p);
    // 涉水:已进到水里但还没到游泳深度
    const wasWading = this.wading;
    this.wading = !this.swimming && groundY < waterY - 0.1;
    if (this.wading !== wasWading) this.waterFx.splash(p);

    if (this.slowLeft > 0) this.slowLeft = Math.max(0, this.slowLeft - delta);
    if (this.refreshLeft > 0) this.refreshLeft = Math.max(0, this.refreshLeft - delta);
    if (this.tipsyLeft > 0) this.tipsyLeft = Math.max(0, this.tipsyLeft - delta);

    if (this.remote) {
      // 遥控玩家:向网络快照姿态插值(朝向沿最短弧转),移动感由剩余距离推出以驱动走路动画
      const k = 1 - Math.pow(0.0001, delta);
      this.moving = p.distanceTo(this.netPos) > 0.05;
      p.lerp(this.netPos, k);
      const diff = Math.atan2(
        Math.sin(this.netRotY - this.group.rotation.y),
        Math.cos(this.netRotY - this.group.rotation.y)
      );
      this.group.rotation.y += diff * k;
    } else if (this.moving) {
      const len = this.moveVec.length();
      const base = (this.swimming ? SWIM_SPEED : MOVE_SPEED) * GmSystem.speedMultiplier;
      let speed = base;
      // 冰面滑行:结冰水洼上移动速度翻倍
      if (!this.swimming && this.terrain.isOnIce(p.x, p.z)) speed *= 2;
      if (this.slowLeft > 0) speed *= 0.5;
      if (this.refreshLeft > 0) speed *= 1.3;
      else if (this.tipsyLeft > 0) speed *= 0.9;
      const step = speed * delta;
      p.x += (this.moveVec.x / len) * step;
      p.z += (this.moveVec.y / len) * step;
      // 静态阻挡:被推出树、大石等不可穿越的物件(游泳时不管)
      if (!this.swimming) for (const o of this.obstacles) o.resolveCollision(p, PLAYER_RADIUS);
      this.group.rotation.y = Math.atan2(this.moveVec.x, this.moveVec.y);
      // 陆地上行走按步距交替留脚印,水中不留
      if (!this.swimming && !this.wading) {
        this.stepDistance += step;
        if (this.stepDistance >= STEP_DISTANCE) {
          this.stepDistance = 0;
          this.stepLeft = !this.stepLeft;
          this.footprints.step(p.x, p.z, this.group.rotation.y, this.stepLeft);
        }
      }
    } else {
      this.stepDistance = 0;
    }

    // 游泳后按头部实际位置对齐水线；岸上贴地。
    p.y = this.swimming ? waterY : this.terrain.getHeight(p.x, p.z);

    if (this.swimming) {
      this.group.rotation.x += (0.55 - this.group.rotation.x) * (1 - Math.exp(-10 * delta));

      this.animator.update(delta, elapsed, null, 0,
        Math.hypot(p.x - previousX, p.z - previousZ) / Math.max(delta, 0.001), true, this.handTool);
      this.appearance.head.getWorldPosition(this.swimHead);
      // 头部对齐水线后再整体上抬，让肩膀露出水面
      p.y += waterY - this.swimHead.y + 0.3 + Math.sin(elapsed * 2) * 0.012;
      this.swordTrail.clear();
      this.waterFx.updateSwimming(delta, p, 0.4, waterY);
      // 游泳时收起工具,避免抡着斧子划水
      for (const model of Object.values(this.toolModels).flat()) model.visible = false;
      this.placeMount.visible = false;
    } else {
      // 涉水移动时脚下泛涟漪
      if (this.wading && this.moving) this.waterFx.updateSwimming(delta, p, 0.55, waterY);
      this.refreshToolModels();
      const action = !this.moving || this.action === 'slash' ? this.action : null;
      if (action) this.actionTime += delta;
      this.group.rotation.x += (0 - this.group.rotation.x) * (1 - Math.exp(-14 * delta));
      this.group.rotation.z += (0 - this.group.rotation.z) * (1 - Math.exp(-14 * delta));
      this.animator.update(delta, elapsed, action, this.actionTime,
        Math.hypot(p.x - previousX, p.z - previousZ) / Math.max(delta, 0.001), false, this.handTool);
      const swords = this.toolModels.sword!;
      const sword = swords[Math.min(this.toolTiers.sword ?? 1, swords.length) - 1];
      this.swordTrail.update(delta, action === 'slash' && this.handTool === 'sword' ? sword : null, this.actionTime);
    }
  }

  /** 死亡姿态:原地向前扑倒侧躺,四肢摊开,之后每帧只保持贴地 */
  private updateDead(delta: number): void {
    this.animator.relax(delta);
    this.swordTrail.clear();
    this.moving = false;
    const k = 1 - Math.pow(0.002, delta);
    this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, Math.PI / 2, k);
    this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, 0.3, k);
    const p = this.group.position;
    p.y = this.terrain.getHeight(p.x, p.z);
    for (const arm of this.arms) arm.rotation.x = THREE.MathUtils.lerp(arm.rotation.x, 0.5, k);
  }

  /** 睡眠姿态:慢慢挪上床躺平,四肢放松,随呼吸轻微起伏;睡下后输入被忽略,直到睡满 */
  private updateSleep(delta: number, elapsed: number): void {
    this.animator.relax(delta);
    this.swordTrail.clear();
    this.moving = false;
    const pose = this.sleepPose!;
    const k = 1 - Math.pow(0.002, delta);
    this.group.position.lerp(pose.pos, k);
    this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, -Math.PI / 2, k);
    // 放松的躺姿:双臂微张随呼吸轻摆,双腿伸直
    for (const [i, arm] of this.arms.entries()) {
      arm.rotation.x = -0.15 + Math.sin(elapsed * 1.6 + i * Math.PI) * 0.05;
      arm.rotation.z = 0.18 + i * 0.06;
    }
    for (const leg of this.legs) {
      leg.rotation.x = 0;
      leg.rotation.z = 0;
    }
    // 呼吸起伏:身体轻轻抬落
    this.group.position.y = pose.pos.y + Math.sin(elapsed * 1.6) * 0.02;
  }

  dispose(): void {
    this.swordTrail.dispose();
    this.wardrobe.dispose();
    this.input.dispose();
  }
}
