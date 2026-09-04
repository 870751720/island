import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import { IslandTerrain } from '../world/IslandTerrain';
import type { Player } from './Player';
import { ANIMAL_BUILDERS } from './WildlifeModels';
import type { ResourceKind } from '../systems/Inventory';
import type { Particles } from '../fx/Particles';
import type { SfxName } from '../audio/Sfx';

export type AnimalSpecies = 'rabbit' | 'sheep' | 'deer' | 'bear';

/** 击杀掉落的战利品(兽肉之外按物种附带不同材料) */
export type AnimalLoot = { kind: ResourceKind; count: number }[];

/** 草地高度带:高于沙滩带上限算草地,动物只在草地上活动 */
const GRASS_MIN = 0.16;
/** 玩家死后 / 游泳时不再触发受击与追击 */
const DAY_RESPAWN = 40;
const BEAR_RESPAWN = 90;

// —— 熊的威胁行为参数 ——
/** 力竭后的追击速度:明显慢于玩家步行,给玩家拉开距离的窗口 */
const BEAR_TIRED_SPEED = 1.1;
/** 冲刺体力上限(秒):追击时按秒耗,耗尽力竭掉速 */
const BEAR_SPRINT_TIME = 4.5;
/** 力竭喘息时长:喘完立刻回满体力再冲刺,形成「冲刺—喘息—再冲刺」的节奏 */
const BEAR_TIRED_TIME = 1.6;
/** 非追击时的体力恢复速率(倍) */
const BEAR_STAMINA_REGEN = 1.5;
/** 中箭后的暴怒时长与速度加成:远程偷袭会立刻招致反扑 */
const BEAR_RAGE_TIME = 5;
const BEAR_RAGE_BONUS = 0.5;
/** 扑击窗口:玩家进入该距离内且冷却好则人立蓄力后腾跃扑击 */
const BEAR_POUNCE_MAX = 3.4;
const BEAR_POUNCE_WINDUP = 0.19;
const BEAR_POUNCE_LEAP = 0.32;
const BEAR_POUNCE_SPEED = 9;
const BEAR_POUNCE_RECOVER = 0.9;
const BEAR_POUNCE_LAND_RANGE = 1.6;
/** 玩家劳作/放箭的噪音惊动半径 */
const NOISE_RANGE = 9;
/** 落地尘土 / 冲刺扬尘的颜色 */
const DUST_COLOR = '#b3a284';

/** 熊扑击的三段状态:人立蓄力 → 腾跃 → 落地硬直 */
type BearPounce = { phase: 'windup' | 'leap' | 'recover'; left: number; dir: number };

type SpeciesConfig = {
  label: string;
  count: number;
  /** 平时游荡速度 */
  walkSpeed: number;
  /** 被玩家靠近时的逃跑速度(熊为追击速度) */
  rushSpeed: number;
  /** 玩家靠到这个距离内触发逃跑/追击 */
  senseRange: number;
  /** 警戒平息距离:玩家离到这个距离外才恢复游荡(应大于 senseRange,形成迟滞) */
  deaggroRange: number;
  /** 熊的扑击距离与伤害 */
  attackRange: number;
  damage: number;
  attackCooldown: number;
  /** 中几箭倒下 */
  hp: number;
  /** 击杀掉落的战利品 */
  loot: AnimalLoot;
  respawn: number;
};

const SPECIES: Record<AnimalSpecies, SpeciesConfig> = {
  rabbit: {
    label: '兔子',
    count: 5,
    walkSpeed: 1.2,
    rushSpeed: 3.4,
    senseRange: 2.6,
    deaggroRange: 3.6,
    attackRange: 0,
    damage: 0,
    attackCooldown: 0,
    hp: 1,
    loot: [
      { kind: 'gameMeat', count: 1 },
      { kind: 'fur', count: 1 },
    ],
    respawn: DAY_RESPAWN,
  },
  sheep: {
    label: '绵羊',
    count: 4,
    walkSpeed: 0.9,
    rushSpeed: 2.4,
    senseRange: 3,
    deaggroRange: 4.2,
    attackRange: 0,
    damage: 0,
    attackCooldown: 0,
    hp: 1,
    loot: [
      { kind: 'gameMeat', count: 2 },
      { kind: 'fur', count: 2 },
    ],
    respawn: DAY_RESPAWN,
  },
  deer: {
    label: '鹿',
    count: 4,
    walkSpeed: 1.4,
    rushSpeed: 3.6,
    senseRange: 3.4,
    deaggroRange: 4.8,
    attackRange: 0,
    damage: 0,
    attackCooldown: 0,
    hp: 1,
    loot: [
      { kind: 'gameMeat', count: 3 },
      { kind: 'fur', count: 2 },
    ],
    respawn: DAY_RESPAWN,
  },
  bear: {
    label: '熊',
    count: 1,
    walkSpeed: 0.8,
    /** 追击冲刺速度:略快于玩家步行,必须靠耐力机制给出喘息窗口 */
    rushSpeed: 3.9,
    senseRange: 7,
    deaggroRange: 13,
    attackRange: 1.3,
    damage: 45,
    attackCooldown: 1.6,
    hp: 3,
    loot: [
      { kind: 'gameMeat', count: 4 },
      { kind: 'fur', count: 4 },
    ],
    respawn: BEAR_RESPAWN,
  },
};

type Animal = {
  /** 同步用短 id(房主递增分配,状态快照按 id 对应) */
  id: number;
  species: AnimalSpecies;
  config: SpeciesConfig;
  model: ReturnType<(typeof ANIMAL_BUILDERS)[AnimalSpecies]>;
  pos: THREE.Vector3;
  target: THREE.Vector3;
  heading: number;
  netPos: THREE.Vector3;
  netHeading: number;
  walkTime: number;
  idleTime: number;
  phase: number;
  hp: number;
  alive: boolean;
  respawnLeft: number;
  attackLeft: number;
  /** 扑击动画计时(>0 时头部前顶) */
  lungeLeft: number;
  /** 草食动物的受惊状态(带迟滞,避免在警戒边界反复切换) */
  alerted: boolean;
  /** 展示朝向(向逻辑朝向平滑过渡,避免状态切换时硬切) */
  viewHeading: number;
  // —— 熊专属状态(其他物种恒为初始值) ——
  /** 追击冲刺的剩余体力(秒),耗尽力竭掉速,非追击时恢复 */
  stamina: number;
  /** 力竭喘息的剩余时长:喘完体力回满,恢复冲刺 */
  tiredLeft: number;
  /** 中箭后的暴怒剩余时长:加速追击 + 红眼 */
  rageLeft: number;
  /** 咆哮动画与音效的剩余时长(进入警戒/暴怒时触发) */
  roarLeft: number;
  /** 是否已播放过本次警戒的咆哮(上升沿检测) */
  roared: boolean;
  /** 扑击进行中的状态(未扑击时为 null) */
  pounce: BearPounce | null;
  /** 冲刺扬尘的发射计时 */
  dustLeft: number;
};

/**
 * 草地上的野生动物:兔、羊、鹿见玩家靠近就逃;熊会追击并扑击玩家。
 * 都可用弓箭猎捕,倒下后掉落兽肉,隔段时间在岛上别处重新刷新。
 */
export class Wildlife implements Updatable {
  readonly group = new THREE.Group();
  private animals: Animal[] = [];
  private nextId = 1;

  constructor(
    scene: THREE.Scene,
    private terrain: IslandTerrain,
    /** 全部玩家(联机时多人,动物对最近的一名做出反应) */
    private players: () => Player[],
    /** 熊扑击命中玩家时对该玩家造成伤害(游戏侧负责掉血与特效);pounce 标记是扑击命中(近身挥击为 false) */
    private onPlayerHit: (player: Player, damage: number, pounce?: boolean) => void,
    /** 某玩家当前是否可被攻击(死亡时不追击) */
    private isPlayerVulnerable: (player: Player) => boolean,
    /** 尘土等粒子特效(咆哮扬尘/扑击落地/冲刺扬尘) */
    private fx: Particles,
    /** 播放音效(熊咆哮/扑击破空) */
    private playSound: (name: SfxName, x: number, z: number) => void,
    /** 围栏等静态阻挡:点在阻挡内时动物不可走(围栏闭合即被圈住) */
    private isBlocked: (x: number, z: number) => boolean = () => false,
    rng: () => number = Math.random
  ) {
    for (const species of Object.keys(SPECIES) as AnimalSpecies[]) {
      const config = SPECIES[species];
      for (let i = 0; i < config.count; i++) {
        const spawn = this.findGrassSpot(rng);
        if (!spawn) continue;
        const model = ANIMAL_BUILDERS[species]();
        model.group.position.copy(spawn);
        this.group.add(model.group);
        const heading = rng() * Math.PI * 2;
        this.animals.push({
          id: this.nextId++,
          species,
          config,
          model,
          pos: spawn.clone(),
          target: spawn.clone(),
          heading,
          netPos: spawn.clone(),
          netHeading: heading,
          walkTime: 0,
          idleTime: rng() * 4,
          phase: rng() * Math.PI * 2,
          hp: config.hp,
          alive: true,
          respawnLeft: 0,
          attackLeft: 0,
          lungeLeft: 0,
          alerted: false,
          viewHeading: heading,
          stamina: BEAR_SPRINT_TIME,
          tiredLeft: 0,
          rageLeft: 0,
          roarLeft: 0,
          roared: false,
          pounce: null,
          dustLeft: 0,
        });
      }
    }
    scene.add(this.group);
  }

  /** 某点是否为可站立的草地(不进沙滩,也不进海与池塘等水面之下) */
  private isGrass(x: number, z: number): boolean {
    const r = Math.hypot(x, z);
    if (r > this.terrain.size / 2 - 2) return false;
    const y = this.terrain.getHeight(x, z);
    if (y < GRASS_MIN) return false;
    // 池塘处地形被挖到水面之下,陆地处水面高度即地形高度
    if (this.isBlocked(x, z)) return false;
    return y >= this.terrain.getWaterLevel(x, z) - 0.02;
  }

  /** 距某点最近的玩家(无玩家在场返回 null) */
  private nearestPlayer(x: number, z: number): Player | null {
    let best: Player | null = null;
    let bestDist = Infinity;
    for (const t of this.players()) {
      if (!this.isPlayerVulnerable(t)) continue;
      const p = t.group.position;
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < bestDist) {
        best = t;
        bestDist = d;
      }
    }
    return best;
  }

  /** 在岛上随机撒点找一处草地(离所有玩家远一点,避免刷新在脸上) */
  private findGrassSpot(rng: () => number): THREE.Vector3 | null {
    const maxR = this.terrain.size / 2 - 3;
    for (let i = 0; i < 40; i++) {
      const a = rng() * Math.PI * 2;
      const r = 4 + rng() * (maxR - 4);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (!this.isGrass(x, z)) continue;
      let near = false;
      for (const t of this.players()) {
        const p = t.group.position;
        if (Math.hypot(x - p.x, z - p.z) < 8) near = true;
      }
      if (near) continue;
      return new THREE.Vector3(x, this.terrain.getHeight(x, z), z);
    }
    return null;
  }

  /** 在动物附近找下一个游荡目标,只接受草地上的点 */
  private pickTarget(animal: Animal, rng: () => number, range = 5): boolean {
    for (let i = 0; i < 8; i++) {
      const a = rng() * Math.PI * 2;
      const d = 1 + rng() * range;
      const x = animal.pos.x + Math.cos(a) * d;
      const z = animal.pos.z + Math.sin(a) * d;
      if (this.isGrass(x, z)) {
        animal.target.set(x, this.terrain.getHeight(x, z), z);
        return true;
      }
    }
    return false;
  }

  /** 朝目标方向走一步,前方不是草地时依次试切线方向;返回是否移动成功 */
  private step(animal: Animal, angle: number, speed: number, delta: number): boolean {
    const tryDir = (a: number): boolean => {
      const nx = animal.pos.x + Math.cos(a) * speed * delta;
      const nz = animal.pos.z + Math.sin(a) * speed * delta;
      if (!this.isGrass(nx, nz)) return false;
      animal.pos.set(nx, this.terrain.getHeight(nx, nz), nz);
      animal.heading = a;
      return true;
    };
    if (tryDir(angle)) return true;
    for (const da of [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2]) {
      if (tryDir(angle + da)) return true;
    }
    return false;
  }

  update(delta: number, elapsed: number): void {
    for (const animal of this.animals) {
      if (!animal.alive) {
        animal.respawnLeft -= delta;
        if (animal.respawnLeft <= 0) this.respawn(animal);
        continue;
      }
      // 对最近的一名玩家做出反应(联机时熊追离得最近的那个人)
      const target = this.nearestPlayer(animal.pos.x, animal.pos.z);
      const p = target ? target.group.position : animal.pos;
      const vulnerable = target ? this.isPlayerVulnerable(target) : false;
      const dist = target ? Math.hypot(p.x - animal.pos.x, p.z - animal.pos.z) : Infinity;
      const hostile = animal.species === 'bear';
      // 带迟滞的警戒:靠近立刻触发,离得明显更远才平息,否则会在边界上来回抖动
      if (dist < animal.config.senseRange) animal.alerted = true;
      else if (dist > animal.config.deaggroRange) animal.alerted = false;
      // 受伤的熊即使玩家超出感知半径也会记仇反扑
      if (hostile && animal.hp < animal.config.hp && dist < animal.config.deaggroRange) {
        animal.alerted = true;
      }
      const rushed = animal.alerted && vulnerable;

      animal.walkTime += delta;
      animal.attackLeft = Math.max(0, animal.attackLeft - delta);
      animal.lungeLeft = Math.max(0, animal.lungeLeft - delta);
      animal.rageLeft = Math.max(0, animal.rageLeft - delta);
      animal.roarLeft = Math.max(0, animal.roarLeft - delta);
      // 进入警戒的上升沿:熊仰头咆哮警告(吼声 + 口鼻扬尘),食草动物无声逃窜
      if (hostile && animal.alerted && !animal.roared) this.roar(animal);
      if (!animal.alerted) animal.roared = false;
      // 玩家脱离追击(死亡/游泳/平息)时中止进行中的扑击
      if (!rushed) animal.pounce = null;

      let moving = false;
      if (hostile && animal.pounce) {
        // 扑击三段:人立蓄力(留侧闪窗口)→ 朝锁定方向腾跃 → 落地结算伤害并硬直
        const pounce = animal.pounce;
        pounce.left -= delta;
        animal.target.copy(animal.pos);
        animal.idleTime = 0;
        animal.walkTime = 0;
        if (pounce.phase === 'windup') {
          animal.heading = Math.atan2(p.z - animal.pos.z, p.x - animal.pos.x);
          if (pounce.left <= 0) {
            pounce.phase = 'leap';
            pounce.left = BEAR_POUNCE_LEAP;
            pounce.dir = animal.heading;
            this.playSound('whoosh', animal.pos.x, animal.pos.z);
          }
        } else if (pounce.phase === 'leap') {
          moving = this.step(animal, pounce.dir, BEAR_POUNCE_SPEED, delta);
          if (pounce.left <= 0 || !moving) {
            this.fx.burst(animal.pos.clone(), DUST_COLOR, 10);
            if (vulnerable && Math.hypot(p.x - animal.pos.x, p.z - animal.pos.z) <= BEAR_POUNCE_LAND_RANGE) {
              animal.lungeLeft = 0.35;
              this.onPlayerHit(target!, animal.config.damage, true);
            }
            pounce.phase = 'recover';
            pounce.left = BEAR_POUNCE_RECOVER;
          }
        } else if (pounce.left <= 0) {
          animal.pounce = null;
        }
      } else if (rushed && hostile && dist <= animal.config.attackRange) {
        // 近身挥击:面向玩家原地挥击,冷却好才真正造成伤害
        animal.heading = Math.atan2(p.z - animal.pos.z, p.x - animal.pos.x);
        if (animal.attackLeft <= 0) {
          animal.attackLeft = animal.config.attackCooldown;
          animal.lungeLeft = 0.35;
          this.onPlayerHit(target!, animal.config.damage);
        }
      } else if (rushed) {
        // 逃跑(草食)/ 追击(熊):清掉游荡目标,平息后重新选路
        animal.target.copy(animal.pos);
        animal.idleTime = 0;
        animal.walkTime = 0;
        const away = Math.atan2(animal.pos.z - p.z, animal.pos.x - p.x);
        const angle = hostile ? away + Math.PI : away;
        let speed = animal.config.rushSpeed;
        if (hostile) {
          if (dist <= BEAR_POUNCE_MAX && animal.attackLeft <= 0 && animal.stamina > 1) {
            // 扑击窗口:中距离人立蓄力后腾跃,伴随咆哮威慑
            animal.attackLeft = animal.config.attackCooldown;
            animal.pounce = { phase: 'windup', left: BEAR_POUNCE_WINDUP, dir: 0 };
            this.roar(animal);
          } else {
            if (animal.stamina > 0) {
              // 冲刺:体力按秒耗,耗尽转入喘息;暴怒期额外加速;身后扬尘
              animal.stamina -= delta;
              if (animal.stamina <= 0) animal.tiredLeft = BEAR_TIRED_TIME;
              if (animal.rageLeft > 0) speed += BEAR_RAGE_BONUS;
              animal.dustLeft -= delta;
              if (animal.dustLeft <= 0) {
                animal.dustLeft = 0.22;
                this.fx.burst(animal.pos.clone(), DUST_COLOR, 2);
              }
            } else {
              // 力竭喘息:短暂掉速后体力回满,开始下一轮冲刺
              animal.tiredLeft -= delta;
              if (animal.tiredLeft <= 0) animal.stamina = BEAR_SPRINT_TIME;
              speed = BEAR_TIRED_SPEED;
            }
            moving = this.step(animal, angle, speed, delta);
          }
        } else {
          moving = this.step(animal, angle, speed, delta);
        }
      } else {
        animal.stamina = Math.min(BEAR_SPRINT_TIME, animal.stamina + delta * BEAR_STAMINA_REGEN);
        animal.tiredLeft = 0;
        if (animal.idleTime > 0) {
          animal.idleTime -= delta;
        } else if (animal.walkTime > 8 || animal.pos.distanceToSquared(animal.target) < 0.04) {
          animal.idleTime = 1 + Math.random() * 4;
          animal.walkTime = 0;
          if (!this.pickTarget(animal, Math.random)) animal.walkTime = 9;
        } else {
          const angle = Math.atan2(
            animal.target.z - animal.pos.z,
            animal.target.x - animal.pos.x
          );
          moving = this.step(animal, angle, animal.config.walkSpeed, delta);
          if (!moving) animal.walkTime = 9;
        }
      }

      this.animate(animal, delta, elapsed, moving, rushed);
    }
  }

  /** 应用位置朝向;朝向平滑转向目标角,移动时对角迈腿,受惊/追击时加快频率,熊扑击时头部前顶 */
  private animate(animal: Animal, delta: number, elapsed: number, moving: boolean, excited: boolean): void {
    const g = animal.model.group;
    g.position.copy(animal.pos);
    // 兔子蹦着走:移动时整体做抛物线小跳,四腿收起
    const hop = animal.species === 'rabbit';
    if (hop && moving) {
      g.position.y += Math.abs(Math.sin(elapsed * (excited ? 13 : 8) + animal.phase)) * 0.24;
    }
    // 模型面朝 +Z,朝向按移动方向角换算;沿最短弧平滑转向,避免状态切换时硬切
    const diff = Math.atan2(
      Math.sin(animal.heading - animal.viewHeading),
      Math.cos(animal.heading - animal.viewHeading)
    );
    animal.viewHeading += diff * Math.min(1, delta * 12);
    g.rotation.y = Math.PI / 2 - animal.viewHeading;

    const speed = moving ? (excited ? 12 : 6) : 0;
    animal.model.legs.forEach((leg, i) => {
      // 前左/后右一组,前右/后左一组,交替摆动
      const pair = i === 0 || i === 3 ? 0 : Math.PI;
      const swing = Math.sin(elapsed * speed + animal.phase + pair);
      leg.rotation.x = moving && !hop ? swing * 0.6 : 0;
    });
    // 头颈:平时轻晃,近身挥击瞬间向前顶
    let bob = animal.lungeLeft > 0 ? 0.28 : Math.sin(elapsed * 2 + animal.phase) * 0.04;
    let headPitch = animal.lungeLeft > 0 ? -0.4 : 0;
    if (animal.species === 'bear') {
      // 身体俯仰:扑击蓄力人立后仰 → 腾跃前倾 → 落地硬直低伏 → 冲刺轻前倾 → 力竭喘息下沉
      const pounce = animal.pounce;
      let pitch = 0;
      if (pounce?.phase === 'windup') {
        pitch = -0.45;
        headPitch = 0.35;
        bob = 0.06;
        // 人立蓄力:前肢扬起
        animal.model.legs[0].rotation.x = -1.1;
        animal.model.legs[1].rotation.x = -1.1;
      } else if (pounce?.phase === 'leap') {
        pitch = 0.35;
        headPitch = -0.5;
      } else if (pounce?.phase === 'recover') {
        pitch = 0.12;
        headPitch = 0.3;
        bob = -0.08;
      } else if (animal.roarLeft > 0) {
        // 咆哮:昂首上仰
        headPitch = 0.5;
        bob = 0.1;
      } else if (excited && animal.stamina <= 0) {
        // 力竭:垂头喘气,身体随呼吸起伏
        headPitch = 0.32;
        pitch = 0.08 + Math.sin(elapsed * 6) * 0.02;
      } else if (excited && moving && animal.stamina > 0) {
        pitch = 0.12;
      }
      g.rotation.x = pitch;
      // 暴怒红眼(发亮),平时深色小眼
      const rage = animal.rageLeft > 0;
      animal.model.eyes?.forEach((eye) => {
        const mat = eye.material as THREE.MeshStandardMaterial;
        mat.color.set(rage ? '#ff4438' : '#2a2018');
        mat.emissive.set(rage ? '#8c1a10' : '#000000');
      });
    }
    animal.model.head.position.z = (animal.species === 'bear' ? 0.48 : animal.species === 'deer' ? 0.34 : animal.species === 'rabbit' ? 0.22 : 0.4) + bob;
    animal.model.head.rotation.x = headPitch;
    // 尾巴轻摆
    animal.model.tail.rotation.y = Math.sin(elapsed * 3 + animal.phase) * 0.3;
  }

  /** 熊咆哮:吼声 + 口鼻扬尘 + 昂首动画(警戒/暴怒/扑击蓄力时触发) */
  private roar(animal: Animal): void {
    animal.roared = true;
    animal.roarLeft = 0.6;
    const head = animal.pos.clone();
    head.x += Math.cos(animal.heading) * 0.6;
    head.z += Math.sin(animal.heading) * 0.6;
    head.y += 1.1;
    this.fx.burst(head, '#a08b6f', 6);
    this.playSound('roar', animal.pos.x, animal.pos.z);
  }

  /** 噪音惊动:玩家在 (x,z) 发出声响(砍树/放箭等),范围内的动物进入警戒(熊循声戒备、食草动物逃离) */
  startle(x: number, z: number, range = NOISE_RANGE): void {
    for (const animal of this.animals) {
      if (!animal.alive) continue;
      if (Math.hypot(x - animal.pos.x, z - animal.pos.z) < range) animal.alerted = true;
    }
  }

  /** 返回范围内最近的一只活动物位置(无则 null),供弓箭索敌 */
  nearestAlive(origin: THREE.Vector3, range: number): THREE.Vector3 | null {
    let best: Animal | null = null;
    let bestDist = range * range;
    for (const animal of this.animals) {
      if (!animal.alive) continue;
      const d = animal.pos.distanceToSquared(origin);
      if (d < bestDist) {
        best = animal;
        bestDist = d;
      }
    }
    return best ? best.pos.clone() : null;
  }

  /**
   * 箭矢命中判定:对范围内最近的活动物造成指定伤害(精致弓伤害更高)。
   * 返回被击倒物种的对象(应掉落战利品)、'hit'(受伤未死)或 null(未命中)。
   */
  damageNearby(
    pos: THREE.Vector3,
    range: number,
    damage = 1
  ): { species: AnimalSpecies } | 'hit' | null {
    let best: Animal | null = null;
    let bestDist = range * range;
    for (const animal of this.animals) {
      if (!animal.alive) continue;
      const d = animal.pos.distanceToSquared(pos);
      if (d < bestDist) {
        best = animal;
        bestDist = d;
      }
    }
    if (!best) return null;
    best.hp -= damage;
    if (best.hp > 0) {
      // 熊中箭未死:立刻无视距离锁定玩家并暴怒(加速 + 红眼 + 咆哮),远程偷袭有代价
      if (best.species === 'bear') {
        best.alerted = true;
        best.rageLeft = BEAR_RAGE_TIME;
        this.roar(best);
      }
      return 'hit';
    }
    const species = best.species;
    best.alive = false;
    best.respawnLeft = best.config.respawn;
    best.hp = best.config.hp;
    best.model.group.visible = false;
    return { species };
  }

  /** 击杀应掉落的战利品(按物种:兽肉份数不同,附带材料不同) */
  lootOf(species: AnimalSpecies): AnimalLoot {
    return SPECIES[species].loot;
  }

  /** 联机快照:各动物的位置朝向与存活(房主侧收集) */
  netPoses(): { id: number; x: number; z: number; h: number; alive: boolean }[] {
    return this.animals.map((a) => ({
      id: a.id,
      x: a.pos.x,
      z: a.pos.z,
      h: a.heading,
      alive: a.alive,
    }));
  }

  /** 具有主动攻击能力的动物（当前为熊），联机侧用更高频率同步。 */
  netCombatPoses(): { id: number; x: number; z: number; h: number; alive: boolean }[] {
    return this.netPoses().filter((pose) => this.animals.find((animal) => animal.id === pose.id)?.config.damage);
  }

  /** 无主动攻击能力的动物，保持普通姿态同步频率。 */
  netPassivePoses(): { id: number; x: number; z: number; h: number; alive: boolean }[] {
    return this.netPoses().filter((pose) => !this.animals.find((animal) => animal.id === pose.id)?.config.damage);
  }

  /** 联机应用(客人侧):用房主姿态覆盖本地 AI 推出的结果,存活状态同步可见性 */
  netApply(poses: { id: number; x: number; z: number; h: number; alive: boolean }[]): void {
    const map = new Map(poses.map((p) => [p.id, p]));
    for (const a of this.animals) {
      const p = map.get(a.id);
      if (!p) continue;
      const wasAlive = a.alive;
      a.netPos.set(p.x, this.terrain.getHeight(p.x, p.z), p.z);
      a.netHeading = p.h;
      if (!wasAlive || a.pos.distanceToSquared(a.netPos) > 64) {
        a.pos.copy(a.netPos);
        a.heading = p.h;
        a.viewHeading = p.h;
      }
      a.alive = p.alive;
      a.model.group.visible = p.alive;
    }
  }

  /** 客人端只平滑权威姿态并播放视觉动画，不运行 AI 或伤害结算。 */
  netUpdate(delta: number, elapsed: number): void {
    const k = 1 - Math.exp(-14 * delta);
    for (const a of this.animals) {
      if (!a.alive) continue;
      const beforeX = a.pos.x;
      const beforeZ = a.pos.z;
      a.pos.lerp(a.netPos, k);
      const diff = Math.atan2(Math.sin(a.netHeading - a.heading), Math.cos(a.netHeading - a.heading));
      a.heading += diff * k;
      const moving = Math.hypot(a.pos.x - beforeX, a.pos.z - beforeZ) > 0.0001;
      this.animate(a, delta, elapsed, moving, false);
    }
  }

  private respawn(animal: Animal): void {
    const spot = this.findGrassSpot(Math.random);
    if (!spot) {
      animal.respawnLeft = animal.config.respawn;
      return;
    }
    animal.pos.copy(spot);
    animal.target.copy(spot);
    animal.idleTime = 0;
    animal.walkTime = 0;
    animal.alerted = false;
    animal.viewHeading = animal.heading;
    animal.stamina = BEAR_SPRINT_TIME;
    animal.tiredLeft = 0;
    animal.rageLeft = 0;
    animal.roarLeft = 0;
    animal.roared = false;
    animal.pounce = null;
    animal.alive = true;
    animal.model.group.visible = true;
  }
}
