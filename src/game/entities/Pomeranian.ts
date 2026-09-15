import { DOG_BATTLE_EMOJIS, DOG_BATTLE_EMOJI_SECONDS, DOG_STAGE_NOTICE_SECONDS, type DogBattleEmoji, type DogBattleNotice } from '../systems/DogExpressions';
import * as THREE from 'three';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Player } from './Player';
import type { DropSystem } from '../systems/DropSystem';
import type { Particles } from '../fx/Particles';
import type { WaterFx } from '../fx/WaterFx';
import type { AmbientPose } from '../net/Protocol';
import type { Wildlife } from './Wildlife';
import { DogGrowth, DOG_STAGES, type DogSave } from '../systems/DogGrowth';
import { DogCombat, type DogCompanion, type DogCombatView } from '../systems/DogCombat';

export type DogStageNotice = { stage: number; serial: number };

/** 闻到食物的半径:在这个距离内的地面食物会把狗狗吸引过去 */
const SMELL_RANGE = 9;
/** 吃到食物的距离:走到这么近就开吃 */
const EAT_RANGE = 0.7;
/** 玩家远于该距离时狗狗跟上来,近于该距离时停下自己玩 */
const FOLLOW_RANGE = 3.2;
/** 平时小跑与追食/追人时的奔跑速度 */
const TROT_SPEED = 2.4;
const RUN_SPEED = 4.6;
/** 干地余量:地面高出当地水面(海/水洼)这么多才算可站立的干沙 */
const LAND_MARGIN = 0.05;
/** 狗刨速度:比玩家泳速略慢,免得一路冲到玩家前面 */
const SWIM_SPEED = 2.2;
/** 水深超过该值后改为狗刨浮游,更浅则照常涉水走过 */
const SWIM_DEPTH = 0.3;
/** 狗刨时模型原点(爪尖基准)沉到水面以下这么深,身体半浸、头露出水面 */
const SWIM_FLOAT = 0.12;

/** 表情气泡持续秒数 */
const EMOJI_TIME = 2.6;
/** 闲玩随机表情的间隔与持续(秒):刻意拉长避免刷屏 */
const PLAY_EMOJI_INTERVAL = 60;
const PLAY_EMOJI_TIME = 2;

/** 睡觉/刨坑再触发前的内置冷却,转圈冷却更短 */
const DIG_SLEEP_COOLDOWN = 120;
const SPIN_COOLDOWN = 60;

/** 吃完一份食物的进食动作时长(低头咀嚼) */
const EAT_DURATION = 1.4;
/** 两次进食之间的间隔:吃完一份食物后要馋这么久才肯再吃 */
const EAT_COOLDOWN = 60;
/** 吃饱后的开心转圈时长 */
const HAPPY_DURATION = 2.2;

/** 闲玩行为:围着玩家转圈 / 原地转圈 / 原地趴坐 / 趴下睡觉 / 刨坑 */
type Play = 'circle' | 'spin' | 'sit' | 'sleep' | 'dig';

type DogModel = {
  group: THREE.Group;
  legs: THREE.Mesh[];
  head: THREE.Object3D;
  tail: THREE.Object3D;
  body: THREE.Object3D;
};

function clay(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 一条短腿:锥形杆从髋部垂下,根部落在一端以便摆动 */
function makeLeg(mat: THREE.Material, x: number, y: number, z: number, len: number): THREE.Mesh {
  const leg = new THREE.Mesh(
    new THREE.CylinderGeometry(len * 0.24, len * 0.32, len, 4),
    mat
  );
  leg.geometry.translate(0, -len / 2, 0);
  leg.position.set(x, y, z);
  leg.castShadow = true;
  return leg;
}

/** 低多边形黑色博美:蓬松黑毛圆身 + 张开的鬃毛、尖耳、平贴短尾与粉舌头 */
function makePomeranianModel(): DogModel {
  const group = new THREE.Group();
  const fur = clay('#26262e');
  const mane = clay('#33333d');
  const dark = clay('#101014');

  // 躯干:圆润的毛球,腿短身低,几乎贴地一团黑毛
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 6), fur);
  body.scale.set(0.95, 1, 1.3);
  body.position.y = 0.21;
  body.castShadow = true;
  group.add(body);

  // 头颈:鬃毛大盘 + 略小的头,博美标志性的「狮子脸」
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.39, 0.18);
  const ruff = new THREE.Mesh(new THREE.SphereGeometry(0.17, 7, 6), mane);
  ruff.scale.set(1.1, 0.95, 1);
  ruff.castShadow = true;
  headPivot.add(ruff);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 6), fur);
  head.position.set(0, 0.02, 0.08);
  head.castShadow = true;
  headPivot.add(head);
  // 尖耳朵:小锥体立在头顶两侧
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 4), fur);
    ear.position.set(side * 0.08, 0.16, 0.02);
    ear.rotation.z = -side * 0.25;
    headPivot.add(ear);
  }
  // 黑鼻头 + 粉舌头 + 两个白色像素点眼睛
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.028, 5, 4), dark);
  nose.position.set(0, -0.02, 0.21);
  headPivot.add(nose);
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, 0.07), clay('#e58a95'));
  tongue.position.set(0, -0.06, 0.19);
  headPivot.add(tongue);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 3), clay('#f5f5f5'));
    eye.position.set(side * 0.06, 0.04, 0.18);
    headPivot.add(eye);
  }
  group.add(headPivot);

  // 四条小短腿:短到几乎藏进毛里
  const legs = [
    makeLeg(fur, -0.09, 0.17, 0.14, 0.14),
    makeLeg(fur, 0.09, 0.17, 0.14, 0.14),
    makeLeg(fur, -0.09, 0.18, -0.14, 0.15),
    makeLeg(fur, 0.09, 0.18, -0.14, 0.15),
  ];
  legs.forEach((l) => group.add(l));

  // 尾巴:不翘起,一短串毛球平贴在身后,略微下垂
  const tail = new THREE.Group();
  tail.position.set(0, 0.22, -0.22);
  for (let i = 0; i < 3; i++) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.055 - i * 0.012, 5, 4), i === 0 ? fur : mane);
    ball.position.set(0, -i * 0.015, -i * 0.07);
    ball.castShadow = true;
    tail.add(ball);
  }
  group.add(tail);

  return { group, legs, head: headPivot, tail, body };
}

/** 闲玩时随机冒的表情池 */
const PLAY_EMOJIS = ['🐕', '❤️', '✨', '🐾', '🎾', '😊', '🥰'];
/** 跟随路上偶尔冒的表情池 */
const FOLLOW_EMOJIS = ['🏃', '💨', '❤️'];

/**
 * 黑色博美伴侣:出生在玩家身旁,被附近地面上的食物吸引,吃完回来继续跟随玩家;
 * 距离玩家够近时不跟了,围着玩家转圈或原地打转自己玩,时不时头顶冒个小表情。
 */
export class Pomeranian {
  readonly group = new THREE.Group();
  readonly growth = new DogGrowth();
  private combat: DogCombat | null = null;
  private combatView: DogCombatView = { phase: 'idle', progress: 0 };
  private fighting = false;
  private notice: DogStageNotice | null = null;
  private noticeLeft = 0;
  private noticeSerial = 0;
  private battleEmojiCooldown = 0;
  private battleNotice: DogBattleNotice | null = null;
  onBattleEmoji: (notice: DogBattleNotice) => void = () => {};
  private netPounceTime = -1;
  private pounceSerial = 0;
  onStage: (notice: DogStageNotice) => void = () => {};
  onPounce: (serial: number) => void = () => {};
  private model: DogModel;
  private pos = new THREE.Vector3();

  /** 玩法位置：外层 group 仅作容器，动画位移在内部模型上。 */
  get position(): Readonly<THREE.Vector3> { return this.pos; }
  private heading = 0;
  private readonly netPos = new THREE.Vector3();
  private netHeading = 0;
  /** 进食动作剩余时间(低头咀嚼,不可移动) */
  private eatLeft = 0;
  /** 吃饱后的开心转圈剩余时间 */
  private happyLeft = 0;
  /** 进食冷却剩余时间:归零前不再追食 */
  private eatCd = 0;
  /** 当前头顶表情与剩余显示时间(由 Game 投影到屏幕,交给 React 气泡渲染) */
  private emoji: string | null = null;
  private emojiLeft = 0;
  /** 当前闲玩行为与其剩余时长 */
  private play: Play = 'circle';
  private playLeft = 0;
  /** 围着玩家转圈的绕行方向(1 逆时针 / -1 顺时针) */
  private orbitDir = 1;
  /** 闲玩时随机发表情的倒计时 */
  private emojiTimer = 1.5;
  /** 上一帧是否在跟随:开始跟随时发一次表情 */
  private wasFollowing = false;
  /** 玩家走远后重新回到身边时发一次「想念你」 */
  private waitingForReturn = false;
  /** 睡姿过渡:0 站姿 → 1 完全趴下 */
  private sleepBlend = 0;
  /** 睡觉时冒 💤 的倒计时 */
  private dreamTimer = 0;
  /** 行为内置冷却:刨坑/睡觉共用 2 分钟,转圈 1 分钟 */
  private digCd = 0;
  private sleepCd = 0;
  private spinCd = 0;
  /** 刨坑扬尘的粒子和倒计时 */
  private digDustTimer = 0;
  /** 展示朝向(向逻辑朝向平滑过渡,避免绕障换向时模型瞬间甩转) */
  private viewHeading = 0;
  /** 绕圈被挡后翻转方向的最小间隔:避免在不可走边界上每帧左右横跳 */
  private orbitFlipCd = 0;
  /** 上次绕障用过的偏航角(±45°/±90°):优先沿用,走出平滑的绕行弧线而不是锯齿 */
  private lastDetour = 0;
  /** 当前是否在狗刨:由所在点水深决定,深水漂浮划水,浅水照常走 */
  private swimming = false;
  /** 上一帧是否在狗刨:状态切换瞬间触发入水/出水水花 */
  private wasSwimming = false;

  constructor(
    scene: THREE.Scene,
    private terrain: IslandTerrain,
    private player: Player,
    private fx: Particles,
    private waterFx: WaterFx,
    /** 围栏等静态阻挡:点在阻挡内时不可走 */
    private isBlocked: (x: number, z: number) => boolean = () => false
  ) {
    this.growth.onStage = (stage) => {
      const notice = { stage, serial: this.noticeSerial + 1 };
      this.showStage(notice);
      this.onStage(notice);
    };
    this.model = makePomeranianModel();
    this.group.add(this.model.group);
    this.placeNear(player.group.position, 1.5);
    scene.add(this.group);
  }

  connectCombat(wildlife: Wildlife): void {
    this.combat = new DogCombat(wildlife, this.growth, this.pos,
      (target, speed, delta) => this.stepTo(target, speed, delta, true),
      target => { this.heading = Math.atan2(target.z - this.pos.z, target.x - this.pos.x); },
      (x, z) => this.waterDepth(x, z) <= SWIM_DEPTH);
    this.combat.onPounce = (rescue) => {
      this.onPounce(++this.pounceSerial);
      this.tryBattleEmoji(rescue ? 'dog-guard' : 'dog-bite', rescue);
    };
  }

  get stageNotice(): DogStageNotice | null { return this.noticeLeft > 0 ? this.notice : null; }

  showStage(notice: DogStageNotice): void {
    if (notice.serial <= this.noticeSerial || !DOG_STAGES.some(s => s.stage === notice.stage)) return;
    this.noticeSerial = notice.serial;
    this.notice = notice;
    this.noticeLeft = DOG_STAGE_NOTICE_SECONDS;
  }

  /** 事件和恢复快照共用序号；客人仅播放，不自行随机判定。 */
  showBattleEmoji(notice: DogBattleNotice, duration = DOG_BATTLE_EMOJI_SECONDS): void {
    if (notice.serial <= (this.battleNotice?.serial ?? 0) || !DOG_BATTLE_EMOJIS.includes(notice.glyph)) return;
    this.battleNotice = notice;
    this.showEmoji(notice.glyph, Math.min(DOG_BATTLE_EMOJI_SECONDS, Math.max(0, duration)));
  }

  previewBattleEmoji(glyph: DogBattleEmoji): void {
    this.tryBattleEmoji(glyph, true);
  }

  private tryBattleEmoji(glyph: DogBattleEmoji, guaranteed = false): void {
    if (!guaranteed && (this.battleEmojiCooldown > 0 || Math.random() > 0.5)) return;
    this.battleEmojiCooldown = 8 + Math.random() * 6;
    const notice = { glyph, serial: (this.battleNotice?.serial ?? 0) + 1 };
    this.showBattleEmoji(notice);
    this.onBattleEmoji(notice);
  }

  netPlayPounce(serial: number): void {
    if (serial <= this.pounceSerial) return;
    this.pounceSerial = serial;
    this.netPounceTime = 0;
  }

  get debugState() {
    return { stage: this.growth.config.stage, xp: this.growth.xp, eatCooldown: this.eatCd,
      protectCooldown: this.growth.protectCooldown, companionSeconds: this.growth.companionSeconds,
      combat: this.combat?.status };
  }

  clearCooldowns(): void {
    this.eatCd = this.eatLeft = this.happyLeft = 0;
    this.growth.protectCooldown = 0;
    this.combat?.reset();
  }

  recall(player: Player): void {
    this.player = player;
    this.placeNear(player.group.position, 1.5);
    this.combat?.reset();
  }

  /** 当前正在展示的表情(无则 null),以及头顶气泡锚点的世界坐标 */
  get activeEmoji(): string | null {
    return this.emojiLeft > 0 ? this.emoji : null;
  }

  fillEmojiAnchor(out: THREE.Vector3): void {
    out.set(this.pos.x, this.pos.y + 0.95 + (this.combatView.phase === 'leap' ? Math.sin(this.combatView.progress * Math.PI) * 0.4 : 0), this.pos.z);
  }

  /** 头顶冒一个表情,持续 time 秒 */
  private showEmoji(emoji: string, time = EMOJI_TIME): void {
    this.emoji = emoji;
    this.emojiLeft = time;
  }

  /** 某点是否为可站立的干地:以当地水面为基准,避开海和水洼,干沙滩都能踏 */
  private walkable(x: number, z: number): boolean {
    if (this.isBlocked(x, z)) return false;
    return this.terrain.getHeight(x, z) > this.terrain.getWaterLevel(x, z) + LAND_MARGIN;
  }

  /** 某点水深(水面高出地面的距离) */
  private waterDepth(x: number, z: number): number {
    return this.terrain.getWaterLevel(x, z) - this.terrain.getHeight(x, z);
  }

  /** 移动落点高度:深水贴水漂浮,浅水/干地贴地 */
  private stepY(x: number, z: number): number {
    const waterY = this.terrain.getWaterLevel(x, z);
    return this.waterDepth(x, z) > SWIM_DEPTH ? waterY - SWIM_FLOAT : this.terrain.getHeight(x, z);
  }

  /** 在 anchor 附近找一块干地落脚 */
  private placeNear(anchor: THREE.Vector3, radius: number): void {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = radius + Math.random() * 0.8;
      const x = anchor.x + Math.cos(a) * d;
      const z = anchor.z + Math.sin(a) * d;
      if (this.walkable(x, z)) {
        this.pos.set(x, this.terrain.getHeight(x, z), z);
        return;
      }
    }
    this.pos.set(anchor.x, Math.max(this.terrain.getHeight(anchor.x, anchor.z), 0), anchor.z);
  }

  /** 存档恢复:瞬移到存档位置 */
  restore(x: number, z: number, save: Partial<DogSave> = {}): void {
    this.growth.restore(save);
    this.combat?.restore(save);
    this.eatCd = Number.isFinite(save.eatCooldown) ? Math.min(60, Math.max(0, save.eatCooldown!)) : 0;
    if (this.walkable(x, z)) this.pos.set(x, this.terrain.getHeight(x, z), z);
    else this.placeNear(this.player.group.position, 1.5);
  }

  snapshot(): DogSave {
    return { x: this.pos.x, z: this.pos.z, ...this.growth.snapshot(), ...this.combat?.snapshot(), eatCooldown: this.eatCd };
  }

  netPose(): AmbientPose {
    return { id: 0, x: this.pos.x, y: this.pos.y, z: this.pos.z, h: this.heading, visible: true, state: this.fighting ? 'guard' : this.eatLeft > 0 ? 'eat' : this.play,
      dogBattleGlyph: this.battleNotice?.glyph ?? null, dogBattleSerial: this.battleNotice?.serial ?? 0,
      dogBattleLeft: this.emoji === this.battleNotice?.glyph ? Math.ceil(Math.max(0, this.emojiLeft) * 10) / 10 : 0,
      dogXp: this.growth.xp, dogEatCooldown: Math.ceil(this.eatCd),
      dogProtectCooldown: Math.ceil(this.growth.protectCooldown), dogCompanionSeconds: Math.floor(this.growth.companionSeconds),
      dogPhase: this.combatView.phase, dogProgress: Math.round(this.combatView.progress * 20) / 20,
      dogPounceSerial: this.pounceSerial,
      dogNoticeStage: this.notice?.stage ?? 0, dogNoticeSerial: this.noticeSerial, dogNoticeLeft: Math.ceil(this.noticeLeft) };
  }

  netApply(pose: AmbientPose, _elapsed: number): void {
    if (pose.dogBattleGlyph && (pose.dogBattleLeft ?? 0) > 0) {
      this.showBattleEmoji({ glyph: pose.dogBattleGlyph, serial: pose.dogBattleSerial ?? 0 }, pose.dogBattleLeft);
    }
    this.growth.restore({ xp: pose.dogXp, protectCooldown: pose.dogProtectCooldown, companionSeconds: pose.dogCompanionSeconds });
    this.eatCd = pose.dogEatCooldown ?? 0;
    this.eatLeft = pose.state === 'eat' ? 0.5 : 0;
    this.fighting = pose.state === 'guard';
    if (this.fighting) this.play = 'circle';
    if ((pose.dogNoticeLeft ?? 0) > 0) this.showStage({ stage: pose.dogNoticeStage ?? 0, serial: pose.dogNoticeSerial ?? 0 });
    const phase = pose.dogPhase ?? 'idle';
    const progress = pose.dogProgress ?? 0;
    this.pounceSerial = Math.max(this.pounceSerial, pose.dogPounceSerial ?? 0);
    this.netPounceTime = phase === 'windup' ? progress * 0.18 : phase === 'leap' ? 0.18 + progress * 0.32
      : phase === 'recover' ? 0.5 + progress * 0.3 : -1;
    this.netPos.set(pose.x, pose.y, pose.z);
    this.netHeading = pose.h;
    if (this.pos.distanceToSquared(this.netPos) > 64) {
      this.pos.copy(this.netPos);
      this.heading = pose.h;
    }
    if (pose.state === 'circle' || pose.state === 'spin' || pose.state === 'sit' || pose.state === 'sleep' || pose.state === 'dig') {
      this.play = pose.state;
    }
    this.group.visible = pose.visible;
  }

  /** 客人端逐帧平滑权威快照并播放纯视觉动作。 */
  netUpdate(delta: number, elapsed: number): void {
    this.emojiLeft = Math.max(0, this.emojiLeft - delta);
    this.noticeLeft = Math.max(0, this.noticeLeft - delta);
    if (this.netPounceTime >= 0) {
      this.netPounceTime += delta;
      const t = this.netPounceTime;
      this.combatView = t < 0.18 ? { phase: 'windup', progress: t / 0.18 }
        : t < 0.5 ? { phase: 'leap', progress: (t - 0.18) / 0.32 }
        : t < 0.8 ? { phase: 'recover', progress: (t - 0.5) / 0.3 }
        : { phase: 'idle', progress: 0 };
      if (t >= 0.8) this.netPounceTime = -1;
    } else this.combatView = { phase: 'idle', progress: 0 };
    if (!this.group.visible) return;
    const k = 1 - Math.exp(-14 * delta);
    const moving = this.pos.distanceToSquared(this.netPos) > 0.0004;
    this.pos.lerp(this.netPos, k);
    const diff = Math.atan2(Math.sin(this.netHeading - this.heading), Math.cos(this.netHeading - this.heading));
    this.heading += diff * k;
    this.animate(delta, elapsed, moving, this.play === 'spin');
  }

  /** 朝目标走一步,返回是否仍在途中;直路被挡时优先沿用上次的绕行方向,再试切线方向 */
  private stepTo(target: THREE.Vector3, speed: number, delta: number, shallowOnly = false): boolean {
    const dirX = target.x - this.pos.x;
    const dirZ = target.z - this.pos.z;
    const dist = Math.hypot(dirX, dirZ);
    if (dist < 0.15) return false;
    const angle = Math.atan2(dirZ, dirX);
    const step = Math.min(speed * delta, dist);
    const detours = [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2];
    const order = this.lastDetour === 0
      ? detours
      : [this.lastDetour, ...detours.filter((d) => d !== this.lastDetour)];
    const options = [angle, ...order.map((d) => angle + d)];
    for (const a of options) {
      const nx = this.pos.x + Math.cos(a) * step;
      const nz = this.pos.z + Math.sin(a) * step;
      if (shallowOnly && this.waterDepth(nx, nz) > SWIM_DEPTH) continue;
      let pathBlocked = false;
      const samples = Math.max(1, Math.ceil(step / 0.12));
      for (let i = 1; i <= samples; i++) {
        const x = this.pos.x + (nx - this.pos.x) * i / samples;
        const z = this.pos.z + (nz - this.pos.z) * i / samples;
        if ((shallowOnly && this.waterDepth(x, z) > SWIM_DEPTH)
          || (this.isBlocked(x, z) && this.waterDepth(x, z) <= SWIM_DEPTH)) { pathBlocked = true; break; }
      }
      if (pathBlocked) continue;
      this.heading = a;
      this.lastDetour = a === angle ? 0 : a - angle;
      this.pos.set(nx, this.stepY(nx, nz), nz);
      return true;
    }
    // 四周都走不通(被围栏圈住):留在原地面向目标
    this.heading = angle;
    return false;
  }

  /** 挑下一个闲玩行为:优先围着玩家转圈;睡觉/刨坑/转圈受内置冷却限制 */
  private nextPlay(): void {
    if (this.play === 'dig') this.showEmoji(Math.random() < 0.5 ? '❓' : '😮');
    const pool: Play[] = ['circle', 'circle', 'circle', 'sit'];
    if (this.spinCd <= 0) pool.push('spin');
    if (this.sleepCd <= 0) pool.push('sleep');
    if (this.digCd <= 0) pool.push('dig', 'dig');
    this.play = pool[Math.floor(Math.random() * pool.length)];
    this.playLeft =
      this.play === 'spin'
        ? 1.8
        : this.play === 'sleep'
          ? 9 + Math.random() * 6
          : this.play === 'dig'
            ? 2.5 + Math.random()
            : 3 + Math.random() * 3;
    if (this.play === 'circle') this.orbitDir = Math.random() < 0.5 ? 1 : -1;
    if (this.play === 'dig') {
      this.digCd = DIG_SLEEP_COOLDOWN;
      this.showEmoji('🐾');
    }
    if (this.play === 'sleep') this.sleepCd = DIG_SLEEP_COOLDOWN;
    if (this.play === 'spin') this.spinCd = SPIN_COOLDOWN;
  }

  /** 天黑后趴在玩家身边睡长觉,直到被食物香气或玩家的脚步叫醒 */
  private startNightSleep(): void {
    if (this.play === 'sleep') return;
    this.play = 'sleep';
    this.playLeft = 20 + Math.random() * 20;
    this.dreamTimer = 2;
    this.sleepCd = DIG_SLEEP_COOLDOWN;
  }

  /** 从睡觉中醒来(有食物吃或要跟人时) */
  private wake(): void {
    if (this.play !== 'sleep') return;
    this.play = 'circle';
    this.playLeft = 0.5;
  }

  /** 绕玩家转圈:沿环绕切线方向走一步,路被挡就换方向 */
  private orbitPlayer(speed: number, delta: number, radius: number): boolean {
    const p = this.player.group.position;
    const ox = this.pos.x - p.x;
    const oz = this.pos.z - p.z;
    const r = Math.hypot(ox, oz) || 0.001;
    // 切线方向 + 轻微向目标半径回收,走出一条绕着玩家的螺旋圈
    const tangent = Math.atan2(oz, ox) + this.orbitDir * (Math.PI / 2);
    const pull = (radius - r) / radius;
    const dirX = Math.cos(tangent) + (ox / r) * pull;
    const dirZ = Math.sin(tangent) + (oz / r) * pull;
    const len = Math.hypot(dirX, dirZ) || 1;
    const nx = this.pos.x + (dirX / len) * speed * delta;
    const nz = this.pos.z + (dirZ / len) * speed * delta;
    if (!this.walkable(nx, nz)) {
      // 被挡住:至少间隔 0.6s 才翻转绕行方向,防止在不可走边界上每帧左右横跳
      if (this.orbitFlipCd <= 0) {
        this.orbitDir *= -1;
        this.orbitFlipCd = 0.6;
      }
      return false;
    }
    this.heading = Math.atan2(dirZ, dirX);
    this.pos.set(nx, this.terrain.getHeight(nx, nz), nz);
    return true;
  }

  update(delta: number, elapsed: number, drops: DropSystem, isNight = false, companions: readonly DogCompanion[] = []): void {
    if (delta <= 0) return;
    this.noticeLeft = Math.max(0, this.noticeLeft - delta);
    const nearby = companions.filter(c => !c.dead && c.health > 0
      && Math.hypot(c.player.group.position.x - this.pos.x, c.player.group.position.z - this.pos.z) <= 10);
    this.growth.update(delta, nearby.some(c => c.player.isMoving && !c.player.isSleeping));
    // 当前跟随对象离线或死亡后，改跟仍在场的队员。
    if (!companions.some(c => c.player === this.player && !c.dead)) {
      const next = nearby[0] ?? companions.find(c => !c.dead);
      if (next) this.player = next.player;
    }
    this.battleEmojiCooldown = Math.max(0, this.battleEmojiCooldown - delta);
    const wasFighting = this.fighting;
    this.fighting = this.combat?.update(delta, companions, this.player) ?? false;
    if (this.fighting && !wasFighting) this.tryBattleEmoji('dog-alert');
    this.combatView = this.combat?.view ?? { phase: 'idle', progress: 0 };
    const p = this.player.group.position;
    const playerDist = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
    let moving = false;
    let excited = false;

    if (this.fighting) {
      this.play = 'circle';
      this.eatLeft = this.happyLeft = 0;
      moving = this.combat?.moving ?? false;
      excited = true;
    } else if (this.eatLeft > 0) {
      // 进食中:原地低头咀嚼
      this.eatLeft -= delta;
    } else if (this.happyLeft > 0) {
      // 吃饱了:原地开心转圈
      this.happyLeft -= delta;
      this.heading += delta * 10;
      excited = true;
    } else {
      // 1) 附近有食物:优先跑去吃
      const foodPosition = this.eatCd <= 0 ? drops.nearestDogFood(this.pos, SMELL_RANGE) : null;
      if (foodPosition) {
        this.wake();
        if (Math.hypot(foodPosition.x - this.pos.x, foodPosition.z - this.pos.z) <= EAT_RANGE) {
          const food = drops.consumeDogFoodNear(this.pos, EAT_RANGE);
          if (food) {
            this.growth.add(food.hunger);
            this.eatLeft = EAT_DURATION;
            this.happyLeft = HAPPY_DURATION;
            this.eatCd = EAT_COOLDOWN;
            this.showEmoji(Math.random() < 0.5 ? '😋' : '🦴');
          }
        } else {
          moving = this.stepTo(foodPosition, RUN_SPEED, delta);
          excited = true;
        }
        this.waitingForReturn = false;
        this.wasFollowing = false;
      } else if (this.player.isSwimming || this.swimming) {
        // 2) 玩家下水或自己泡在水里:狗刨着一路跟过去,贴着玩家一起漂;
        //    上了岸水浅后自然切回走路
        this.wake();
        this.wasFollowing = false;
        if (!this.waitingForReturn && playerDist > 14) this.waitingForReturn = true;
        if (this.waitingForReturn && playerDist <= FOLLOW_RANGE) {
          this.waitingForReturn = false;
          this.showEmoji('🥰');
        }
        if (playerDist > FOLLOW_RANGE) {
          moving = this.stepTo(p, SWIM_SPEED, delta);
        } else {
          this.heading = Math.atan2(p.z - this.pos.z, p.x - this.pos.x);
        }
      } else if (playerDist > FOLLOW_RANGE) {
        // 3) 玩家走远:跟上去
        this.wake();
        this.wasFollowing = true;
        moving = this.stepTo(p, playerDist > 8 ? RUN_SPEED : TROT_SPEED, delta);
        excited = playerDist > 8;
        if (!this.waitingForReturn && playerDist > 14) this.waitingForReturn = true;
      } else {
        // 3) 玩家在身边:自己玩;夜里没别的事就趴下睡长觉
        this.wasFollowing = false;
        if (this.waitingForReturn) {
          this.waitingForReturn = false;
          this.showEmoji('🥰');
        }
        if (isNight && this.play !== 'sleep') {
          this.startNightSleep();
        } else {
          this.playLeft -= delta;
          if (this.playLeft <= 0) this.nextPlay();
        }
        if (this.play === 'circle') {
          moving = this.orbitPlayer(TROT_SPEED * 0.55, delta, 1.6 + Math.sin(elapsed * 0.5) * 0.5);
        } else if (this.play === 'spin') {
          // 追尾巴:原地打转
          this.heading += delta * 9;
          excited = true;
        } else if (this.play === 'sleep') {
          // 趴着睡觉,隔一会儿冒个 💤
          this.dreamTimer -= delta;
          if (this.dreamTimer <= 0) {
            this.showEmoji('💤');
            this.dreamTimer = 2.5 + Math.random() * 2;
          }
        }
        // sit:原地趴坐休息,只摇尾巴
        if (this.play !== 'sleep') {
          this.emojiTimer -= delta;
          if (this.emojiTimer <= 0) {
            this.showEmoji(
              PLAY_EMOJIS[Math.floor(Math.random() * PLAY_EMOJIS.length)],
              PLAY_EMOJI_TIME
            );
            this.emojiTimer = PLAY_EMOJI_INTERVAL;
          }
        }
      }
    }

    // 行为内置冷却推进 + 刨坑扬尘
    if (this.eatCd > 0) this.eatCd -= delta;
    if (this.digCd > 0) this.digCd -= delta;
    if (this.sleepCd > 0) this.sleepCd -= delta;
    if (this.spinCd > 0) this.spinCd -= delta;
    if (this.orbitFlipCd > 0) this.orbitFlipCd -= delta;
    if (this.play === 'dig' && this.eatLeft <= 0) {
      this.digDustTimer -= delta;
      if (this.digDustTimer <= 0) {
        this.digDustTimer = 0.16;
        const dust = new THREE.Vector3(
          this.pos.x + Math.cos(this.heading) * 0.28,
          this.pos.y + 0.08,
          this.pos.z + Math.sin(this.heading) * 0.28
        );
        this.fx.burst(dust, '#c9b382', 3);
      }
    }

    this.animate(delta, elapsed, moving, excited);
    if (this.emojiLeft > 0) this.emojiLeft -= delta;
  }

  /** 应用位置与朝向,跑动摆腿、摇尾巴、刨坑扑土、睡觉趴下与咀嚼点头 */
  private animate(delta: number, elapsed: number, moving: boolean, excited: boolean): void {
    const g = this.model.group;
    // 狗刨状态由所在点水深决定(房主/客人端各自判定,表现一致)
    this.swimming = this.waterDepth(this.pos.x, this.pos.z) > SWIM_DEPTH;
    if (this.swimming !== this.wasSwimming) {
      // 入水/出水瞬间:水花 + 一圈涟漪
      this.wasSwimming = this.swimming;
      this.waterFx.splash(new THREE.Vector3(this.pos.x, this.terrain.getWaterLevel(this.pos.x, this.pos.z), this.pos.z));
    }
    if (this.swimming) {
      // 漂浮期间在身后持续泛涟漪,涟漪生成在水面高度
      this.waterFx.updateSwimming(delta, this.pos, 0.45, this.terrain.getWaterLevel(this.pos.x, this.pos.z));
    }
    const bob = this.swimming ? Math.sin(elapsed * 2.2) * 0.04 : 0;
    g.position.set(this.pos.x, this.pos.y + bob, this.pos.z);
    // 狗刨时身体随浪左右轻晃,上岸恢复水平
    g.rotation.z = this.swimming ? Math.sin(elapsed * 1.7) * 0.09 : 0;
    const pounce = this.combatView;
    g.rotation.x = 0;
    if (!this.swimming && pounce.phase === 'windup') {
      g.position.y -= Math.sin(pounce.progress * Math.PI / 2) * 0.09;
    } else if (!this.swimming && pounce.phase === 'leap') {
      g.position.y += Math.sin(pounce.progress * Math.PI) * 0.4;
      g.rotation.x = -0.22 + pounce.progress * 0.44;
    }
    // 朝向沿最短弧平滑过渡:绕障换向/坐下转向时不再瞬间甩转
    const diff = Math.atan2(
      Math.sin(this.heading - this.viewHeading),
      Math.cos(this.heading - this.viewHeading)
    );
    this.viewHeading += diff * Math.min(1, delta * 10);
    g.rotation.y = -this.viewHeading + Math.PI / 2;

    // 睡姿平滑过渡(水里不会趴下)
    const target = !this.swimming && this.play === 'sleep' && this.eatLeft <= 0 ? 1 : 0;
    this.sleepBlend += (target - this.sleepBlend) * Math.min(1, delta * 3);
    const lie = this.sleepBlend;
    const up = 1 - lie;

    const digging = !this.swimming && this.play === 'dig' && this.eatLeft <= 0;
    const speed = moving ? (excited ? 16 : 10) : 0;
    this.model.legs.forEach((leg, i) => {
      let swing: number;
      if (this.swimming) {
        // 狗刨:四条腿在水面下交替扒水
        swing = Math.sin(elapsed * 15 + i * Math.PI * 0.5) * 0.75;
        leg.rotation.x = swing;
        return;
      }
      if (pounce.phase === 'leap') { leg.rotation.x = i < 2 ? -0.9 : 0.7; return; }
      swing = moving ? Math.sin(elapsed * speed + i * Math.PI * 0.5) * 0.7 : 0;
      if (digging && i < 2) {
        // 刨坑:两条前腿飞快交替扒土
        swing = Math.sin(elapsed * 18 + i * Math.PI) * 0.65;
      }
      // 趴下时四腿向前收折贴地
      leg.rotation.x = swing * up + lie * (i % 2 === 0 ? 1.25 : -1.25);
    });

    // 尾巴:睡觉时慢悠悠地摇,其余永远在摇,兴奋/追尾巴时摇成残影
    const wag = this.swimming
      ? Math.sin(elapsed * 6) * 0.3
      : lie > 0.5
        ? Math.sin(elapsed * 3) * 0.12
        : this.play === 'spin' || this.happyLeft > 0
          ? Math.sin(elapsed * 26) * 0.9
          : Math.sin(elapsed * (excited ? 18 : 9)) * (excited ? 0.6 : 0.4);
    this.model.tail.rotation.y = wag;

    // 头部:进食低头,刨坑凑近地面闻,睡觉把头搁在爪子上,狗刨时抬起下巴露出水面,平时随呼吸轻点
    const eating = this.eatLeft > 0;
    const nod = this.swimming
      ? -0.28 + Math.sin(elapsed * 2.5) * 0.08
      : eating
        ? 0.7 + Math.sin(elapsed * 12) * 0.12
        : digging
          ? 0.5
          : Math.sin(elapsed * 2.2) * 0.04 * up + lie * (0.32 + Math.sin(elapsed * 1.6) * 0.02);
    this.model.head.rotation.x = nod;

    // 跑动时轻微起伏;狗刨时随浪轻晃;趴下时身体和头都沉下来
    const bounce = this.swimming ? bob : moving ? Math.abs(Math.sin(elapsed * speed)) * 0.02 : 0;
    this.model.body.position.y = 0.21 - lie * 0.06 + bounce;
    this.model.head.position.y = 0.39 - lie * 0.13 + bounce;
  }
}
