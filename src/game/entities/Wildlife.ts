import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import { nearestToSegmentXZ } from '../core/HitSegment';
import { IslandTerrain } from '../world/IslandTerrain';
import type { Player } from './Player';
import { ANIMAL_BUILDERS } from './WildlifeModels';
import type { ResourceKind } from '../systems/Inventory';
import type { Particles } from '../fx/Particles';
import { CreatureFx } from '../fx/CreatureFx';
import type { SfxName } from '../audio/Sfx';

export type AnimalSpecies = 'rabbit' | 'sheep' | 'deer' | 'wolf' | 'bear' | 'crocodile';

/** 物种中文名(GM 面板等展示用) */
export const ANIMAL_LABELS: Record<AnimalSpecies, string> = {
  rabbit: '兔子',
  sheep: '绵羊',
  deer: '鹿',
  wolf: '狼',
  bear: '熊',
  crocodile: '鳄鱼',
};

/** 击杀掉落的战利品(兽肉之外按物种附带不同材料) */
export type AnimalLoot = { kind: ResourceKind; count: number }[];

/** 草地高度带:高于沙滩带上限算草地,动物只在草地上活动 */
const GRASS_MIN = 0.16;
/** 玩家死后 / 游泳时不再触发受击与追击 */
/** 种群刷新间隔:死亡个体不复活,每隔该时长补足各物种数量 */
const REFRESH_INTERVAL = 8;

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

// —— 鳄鱼的行为参数 ——
/** 陆地活动范围:距所属水洼水边的最大距离(米) */
const CROC_LEASH = 5;
/** 脱战距离:玩家拉开 5 米外立刻丢失仇恨(鳄鱼不设迟滞,脱战即游回水洼) */
const CROC_DEAGGRO = 5;
/** 出场潜伏时长:先藏在水下,只留涟漪预警 */
const CROC_LURK_TIME = 0.5;
/** 出场扑咬的腾跃速度与最长时长 */
const CROC_LEAP_SPEED = 7;
const CROC_LEAP_TIME = 0.55;
/** 出场扑咬的命中判定距离(稍大于普通攻击距离) */
const CROC_LEAP_RANGE = 1.5;
/** 扑咬后的硬直时长 */
const CROC_RECOVER_TIME = 0.9;
/** 水花粒子颜色 */
const WATER_COLOR = '#bfe3f2';

/** 鳄鱼出场的三段状态:水下潜伏 → 跃出扑咬 → 落水硬直 */
type CrocEntrance = { phase: 'lurk' | 'leap' | 'recover'; left: number };

/** 鳄鱼的家:所属水洼(限制活动范围,丢失仇恨后游回去) */
type CrocPond = { x: number; z: number; radius: number };

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
  /** 生命值 */
  hp: number;
  /** 击杀掉落的战利品 */
  loot: AnimalLoot;
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
    hp: 50,
    loot: [
      { kind: 'gameMeat', count: 1 },
      { kind: 'fur', count: 1 },
    ],
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
    hp: 100,
    loot: [
      { kind: 'gameMeat', count: 2 },
      { kind: 'fur', count: 2 },
    ],
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
    hp: 150,
    loot: [
      { kind: 'gameMeat', count: 3 },
      { kind: 'fur', count: 2 },
    ],
  },
  wolf: {
    label: '狼',
    count: 2,
    walkSpeed: 1.25,
    rushSpeed: 3.2,
    senseRange: 6,
    deaggroRange: 10,
    attackRange: 0.95,
    damage: 5,
    attackCooldown: 1.2,
    hp: 75,
    loot: [
      { kind: 'gameMeat', count: 2 },
      { kind: 'fur', count: 2 },
    ],
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
    hp: 1000,
    loot: [
      { kind: 'gameMeat', count: 4 },
      { kind: 'fur', count: 4 },
    ],
  },
  // 鳄鱼只由喝水事件/GM 生成(count 0,种群刷新不补),平时藏在水洼里
  crocodile: {
    label: '鳄鱼',
    count: 0,
    walkSpeed: 0.7,
    rushSpeed: 3.5,
    senseRange: 7,
    deaggroRange: 12,
    attackRange: 1.15,
    damage: 30,
    attackCooldown: 1.8,
    hp: 100,
    loot: [
      { kind: 'gameMeat', count: 2 },
      { kind: 'fur', count: 2 },
    ],
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
  // —— 鳄鱼专属状态(其他物种恒为初始值) ——
  /** 所属水洼(限制活动范围;GM 在远离水洼处生成时为 null,不限制) */
  pond: CrocPond | null;
  /** 出场扑咬进行中的状态(未出场时为 null) */
  entrance: CrocEntrance | null;
};

/**
 * 草地上的野生动物:兔、羊、鹿见玩家靠近就逃;狼会追咬玩家;熊会追击并扑击玩家。
 * 都可用弓箭猎捕,倒下后掉落兽肉,隔段时间在岛上别处重新刷新。
 */
export class Wildlife implements Updatable {
  readonly group = new THREE.Group();
  private animals: Animal[] = [];
  private nextId = 1;
  private creatureFx = new CreatureFx();
  /** 种群刷新检查计时 */
  private refreshLeft = REFRESH_INTERVAL;

  /** 当前某物种的存活数量(种群刷新用) */
  private aliveCount(species: AnimalSpecies): number {
    return this.animals.filter((a) => a.species === species && a.alive).length;
  }

  /** 尸体渐隐结束后移除实体与模型(死亡个体不再复用) */
  private removeAnimal(animal: Animal): void {
    this.animals.splice(this.animals.indexOf(animal), 1);
    this.group.remove(animal.model.group);
  }

  constructor(
    scene: THREE.Scene,
    private terrain: IslandTerrain,
    /** 全部玩家(联机时多人,动物对最近的一名做出反应) */
    private players: () => Player[],
    /** 熊扑击命中玩家时对该玩家造成伤害(游戏侧负责掉血与特效);pounce 标记是扑击命中(近身挥击为 false) */
    private onPlayerHit: (player: Player, damage: number, pounce?: boolean) => void,
    /** 熊开始普通挥击时通知联机层；这是短时动作，走可靠事件而不是姿态采样。 */
    private onAttack: (animalId: number) => void,
    /** 动物受击未死时通知联机层广播(客人端补播闪红);死亡表现由姿态快照翻转驱动,不走这里 */
    private onHit: (animalId: number) => void = () => {},
    /** 熊扑击落地时把权威落点交给联机层补播扬尘。 */
    private onPounceLand: (x: number, y: number, z: number) => void,
    /** 鳄鱼跃出水面的表现交给联机层补播水花。 */
    private onCrocodileBurst: (x: number, y: number, z: number) => void,
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
        this.createAnimal(species, spawn, rng() * Math.PI * 2, rng);
      }
    }
    scene.add(this.group);
  }

  /** 创建并放入一只动物(初始刷新与 GM 生成共用) */
  private createAnimal(
    species: AnimalSpecies,
    spawn: THREE.Vector3,
    heading: number,
    rng: () => number = Math.random
  ): Animal {
    const model = ANIMAL_BUILDERS[species]();
    model.group.position.copy(spawn);
    this.group.add(model.group);
    const animal: Animal = {
      id: this.nextId++,
      species,
      config: SPECIES[species],
      model,
      pos: spawn.clone(),
      target: spawn.clone(),
      heading,
      netPos: spawn.clone(),
      netHeading: heading,
      walkTime: 0,
      idleTime: rng() * 4,
      phase: rng() * Math.PI * 2,
      hp: SPECIES[species].hp,
      alive: true,
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
      pond: species === 'crocodile' ? this.nearestPond(spawn.x, spawn.z) : null,
      entrance: null,
    };
    this.animals.push(animal);
    return animal;
  }

  /** 距 (x,z) 最近的水洼(鳄鱼的家;无水洼返回 null) */
  private nearestPond(x: number, z: number): CrocPond | null {
    let best: CrocPond | null = null;
    let bestDist = Infinity;
    for (const w of this.terrain.waterAreas) {
      const d = Math.hypot(x - w.x, z - w.z);
      if (d < bestDist) {
        best = { x: w.x, z: w.z, radius: w.radius };
        bestDist = d;
      }
    }
    return best;
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

  /** 某点对该动物是否可站立:普通动物只在草地;鳄鱼额外可入水洼,且不超出所属水洼的 leash 范围 */
  private canStand(animal: Animal, x: number, z: number): boolean {
    if (animal.species !== 'crocodile') return this.isGrass(x, z);
    const inPond = this.terrain.getWaterKind(x, z) === 'pond';
    if (!inPond && !this.isGrass(x, z)) return false;
    const pond = animal.pond;
    if (pond && Math.hypot(x - pond.x, z - pond.z) > pond.radius + CROC_LEASH) return false;
    return !this.isBlocked(x, z);
  }

  /** 在动物附近找下一个游荡目标;鳄鱼丢失仇恨后只挑水洼内的点,自己游回去 */
  private pickTarget(animal: Animal, rng: () => number, range = 5): boolean {
    for (let i = 0; i < 8; i++) {
      const a = rng() * Math.PI * 2;
      const d = 1 + rng() * range;
      let x: number;
      let z: number;
      if (animal.species === 'crocodile' && animal.pond) {
        x = animal.pond.x + Math.cos(a) * rng() * animal.pond.radius * 0.7;
        z = animal.pond.z + Math.sin(a) * rng() * animal.pond.radius * 0.7;
      } else {
        x = animal.pos.x + Math.cos(a) * d;
        z = animal.pos.z + Math.sin(a) * d;
      }
      if (this.canStand(animal, x, z)) {
        animal.target.set(x, this.terrain.getHeight(x, z), z);
        return true;
      }
    }
    return false;
  }

  /** 朝目标方向走一步,前方不可站时依次试切线方向;返回是否移动成功 */
  private step(animal: Animal, angle: number, speed: number, delta: number): boolean {
    const tryDir = (a: number): boolean => {
      const nx = animal.pos.x + Math.cos(a) * speed * delta;
      const nz = animal.pos.z + Math.sin(a) * speed * delta;
      if (!this.canStand(animal, nx, nz)) return false;
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
    this.creatureFx.update(delta);
    // 种群刷新:死亡个体不再原地复活,定期补足各物种数量(新个体是全新实体,联机时经 species 快照同步给客人)
    this.refreshLeft -= delta;
    if (this.refreshLeft <= 0) {
      this.refreshLeft = REFRESH_INTERVAL;
      for (const species of Object.keys(SPECIES) as AnimalSpecies[]) {
        const missing = SPECIES[species].count - this.aliveCount(species);
        for (let i = 0; i < missing; i++) {
          const spawn = this.findGrassSpot(Math.random);
          if (!spawn) break;
          this.createAnimal(species, spawn, Math.random() * Math.PI * 2);
        }
      }
    }
    for (const animal of this.animals) {
      if (!animal.alive) continue;
      // 对最近的一名玩家做出反应(联机时主动攻击生物追离得最近的那个人)
      const target = this.nearestPlayer(animal.pos.x, animal.pos.z);
      const p = target ? target.group.position : animal.pos;
      const vulnerable = target ? this.isPlayerVulnerable(target) : false;
      const dist = target ? Math.hypot(p.x - animal.pos.x, p.z - animal.pos.z) : Infinity;
      const hostile = animal.config.damage > 0;
      const bear = animal.species === 'bear';
      // 带迟滞的警戒:靠近立刻触发,离得明显更远才平息,否则会在边界上来回抖动;
      // 鳄鱼例外:玩家一拉开 5 米立刻脱战(先判脱战,感知半径内不会被反复拉回仇恨)
      if (animal.species === 'crocodile') {
        if (dist > CROC_DEAGGRO) animal.alerted = false;
        else if (dist < animal.config.senseRange) animal.alerted = true;
      } else {
        if (dist < animal.config.senseRange) animal.alerted = true;
        else if (dist > animal.config.deaggroRange) animal.alerted = false;
      }
      // 受伤的熊即使玩家超出感知半径也会记仇反扑;鳄鱼记仇同样止步于 5 米
      const grudgeRange = animal.species === 'crocodile' ? CROC_DEAGGRO : animal.config.deaggroRange;
      if (hostile && animal.hp < animal.config.hp && dist < grudgeRange) {
        animal.alerted = true;
      }
      const rushed = animal.alerted && vulnerable;

      animal.walkTime += delta;
      animal.attackLeft = Math.max(0, animal.attackLeft - delta);
      animal.lungeLeft = Math.max(0, animal.lungeLeft - delta);
      animal.rageLeft = Math.max(0, animal.rageLeft - delta);
      animal.roarLeft = Math.max(0, animal.roarLeft - delta);
      // 进入警戒的上升沿:熊仰头咆哮警告(吼声 + 口鼻扬尘),食草动物无声逃窜
      if (bear && animal.alerted && !animal.roared) this.roar(animal);
      if (!animal.alerted) animal.roared = false;
      // 玩家脱离追击(死亡/游泳/平息)时中止进行中的扑击
      if (!rushed) animal.pounce = null;

      let moving = false;
      if (animal.entrance) {
        // 鳄鱼出场三段:水下潜伏(涟漪预警)→ 跃出水面扑向玩家咬一口 → 落水硬直后进入普通追击
        const entrance = animal.entrance;
        entrance.left -= delta;
        animal.target.copy(animal.pos);
        animal.idleTime = 0;
        animal.walkTime = 0;
        if (entrance.phase === 'lurk') {
          animal.heading = Math.atan2(p.z - animal.pos.z, p.x - animal.pos.x);
          // 潜伏涟漪:水面冒泡预警
          animal.dustLeft -= delta;
          if (animal.dustLeft <= 0) {
            animal.dustLeft = 0.18;
            this.fx.burst(animal.pos.clone(), WATER_COLOR, 2);
          }
          if (entrance.left <= 0) {
            entrance.phase = 'leap';
            entrance.left = CROC_LEAP_TIME;
            this.fx.burst(animal.pos.clone(), WATER_COLOR, 14);
            this.playSound('splash', animal.pos.x, animal.pos.z);
            this.onCrocodileBurst(animal.pos.x, animal.pos.y, animal.pos.z);
          }
        } else if (entrance.phase === 'leap') {
          const dir = Math.atan2(p.z - animal.pos.z, p.x - animal.pos.x);
          moving = this.step(animal, dir, CROC_LEAP_SPEED, delta);
          animal.heading = dir;
          if (entrance.left <= 0 || !moving || dist <= animal.config.attackRange) {
            // 扑到跟前(或力竭落水)结一口咬:命中才有伤害,咬完硬直
            if (vulnerable && dist <= CROC_LEAP_RANGE) {
              animal.lungeLeft = 0.35;
              this.onAttack(animal.id);
              this.onPlayerHit(target!, animal.config.damage);
            }
            entrance.phase = 'recover';
            entrance.left = CROC_RECOVER_TIME;
          }
        } else if (entrance.left <= 0) {
          animal.entrance = null;
          // 出场结束后立刻锁定目标,不给脱身窗口
          animal.alerted = true;
        }
      } else if (hostile && animal.pounce) {
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
            this.onPounceLand(animal.pos.x, animal.pos.y, animal.pos.z);
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
          this.onAttack(animal.id);
          this.onPlayerHit(target!, animal.config.damage);
        }
      } else if (rushed) {
        // 逃跑(草食)/追击(狼、熊):清掉游荡目标,平息后重新选路
        animal.target.copy(animal.pos);
        animal.idleTime = 0;
        animal.walkTime = 0;
        const away = Math.atan2(animal.pos.z - p.z, animal.pos.x - p.x);
        const angle = hostile ? away + Math.PI : away;
        let speed = animal.config.rushSpeed;
        if (bear) {
          if (dist <= BEAR_POUNCE_MAX && animal.attackLeft <= 0 && animal.stamina > 1) {
            // 扑击窗口:中距离人立蓄力后腾跃,用短低吼预警而不重复完整咆哮
            animal.attackLeft = animal.config.attackCooldown;
            animal.pounce = { phase: 'windup', left: BEAR_POUNCE_WINDUP, dir: 0 };
            this.roar(animal, true);
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
    // 鳄鱼在水洼里:身体半沉推进;出场潜伏时几乎整个没入水下,只靠涟漪暴露位置
    const croc = animal.species === 'crocodile';
    const crocInWater = croc && this.terrain.getWaterKind(animal.pos.x, animal.pos.z) === 'pond';
    if (croc) {
      g.position.y -= animal.entrance?.phase === 'lurk' ? 0.55 : crocInWater ? 0.22 : 0;
    }
    // 兔子使用完整蹦跳周期:后腿压缩蓄力 → 腾空收腿 → 前爪探地 → 落地回弹。
    const hop = animal.species === 'rabbit';
    const rabbitRig = animal.model.rabbitRig;
    if (hop && rabbitRig) {
      const cycle = elapsed * (excited ? 10.5 : 6.8) + animal.phase;
      const lift = moving ? Math.max(0, Math.sin(cycle)) : 0;
      const launch = moving ? Math.cos(cycle) : 0;
      g.position.y += lift * lift * (excited ? 0.3 : 0.22);
      rabbitRig.body.rotation.x = moving ? -0.12 - launch * 0.1 : -0.12;
      rabbitRig.body.scale.y = moving ? 1 - Math.max(0, -launch) * 0.09 : 1;
      rabbitRig.frontPaws.forEach((paw) => {
        paw.rotation.x = moving ? -0.25 - lift * 0.85 + Math.max(0, -launch) * 0.35 : 0;
      });
      rabbitRig.hindLegs.forEach((leg) => {
        leg.rotation.x = moving ? 0.2 + lift * 1.05 - Math.max(0, -launch) * 0.45 : 0;
      });
      rabbitRig.ears.forEach((ear, i) => {
        ear.rotation.x = moving
          ? -0.08 + lift * 0.42 + launch * 0.12
          : -0.08 + Math.sin(elapsed * 1.7 + animal.phase + i * 0.8) * 0.06;
      });
      const tailPulse = moving ? lift * 0.1 : Math.sin(elapsed * 2 + animal.phase) * 0.025;
      animal.model.tail.scale.set(1 + tailPulse, 1.05 + tailPulse, 0.9 + tailPulse);
    }
    // 模型面朝 +Z,朝向按移动方向角换算;沿最短弧平滑转向,避免状态切换时硬切
    const diff = Math.atan2(
      Math.sin(animal.heading - animal.viewHeading),
      Math.cos(animal.heading - animal.viewHeading)
    );
    animal.viewHeading += diff * Math.min(1, delta * 12);
    g.rotation.y = Math.PI / 2 - animal.viewHeading;

    const speed = moving ? (excited ? 12 : 6) : 0;
    if (!hop) {
      animal.model.legs.forEach((leg, i) => {
        // 前左/后右一组,前右/后左一组,交替摆动
        const pair = i === 0 || i === 3 ? 0 : Math.PI;
        const swing = Math.sin(elapsed * speed + animal.phase + pair);
        if (crocInWater) leg.rotation.x = 0.85; // 游泳:四肢向后收拢贴身,靠尾巴推进
        else leg.rotation.x = moving ? swing * (croc ? 0.35 : 0.6) : 0;
      });
    }
    // 头颈:兔子停下时会轻微嗅闻,其他动物平时轻晃;近身挥击瞬间向前顶。
    let bob = animal.lungeLeft > 0 ? 0.28 : Math.sin(elapsed * 2 + animal.phase) * 0.04;
    let headPitch = animal.lungeLeft > 0 ? -0.4 : 0;
    if (hop) {
      bob = moving ? Math.max(0, Math.sin(elapsed * (excited ? 10.5 : 6.8) + animal.phase)) * 0.035 : Math.sin(elapsed * 3.4 + animal.phase) * 0.018;
      headPitch = moving ? -0.08 : Math.sin(elapsed * 2.2 + animal.phase) * 0.055;
    }
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
    animal.model.head.position.z = (animal.species === 'bear' ? 0.48 : animal.species === 'deer' ? 0.34 : animal.species === 'rabbit' ? 0.22 : animal.species === 'wolf' ? 0.39 : animal.species === 'crocodile' ? 0.52 : 0.4) + bob;
    animal.model.head.rotation.x = headPitch;
    // 兔尾以轻颤为主,鳄鱼在水中靠粗尾左右大幅摆动推进,其余动物轻晃摆尾。
    animal.model.tail.rotation.y = hop
      ? Math.sin(elapsed * 7 + animal.phase) * 0.09
      : croc
        ? Math.sin(elapsed * (crocInWater ? 5 : 3) + animal.phase) * (crocInWater ? 0.45 : 0.25)
        : Math.sin(elapsed * 3 + animal.phase) * 0.3;
  }

  /** 熊咆哮:警戒/暴怒播完整咆哮,扑击蓄力只播短低吼 */
  private roar(animal: Animal, short = false): void {
    animal.roared = true;
    animal.roarLeft = 0.6;
    const head = animal.pos.clone();
    head.x += Math.cos(animal.heading) * 0.6;
    head.z += Math.sin(animal.heading) * 0.6;
    head.y += 1.1;
    this.fx.burst(head, '#a08b6f', 6);
    this.playSound(short ? 'bearGrowl' : 'roar', animal.pos.x, animal.pos.z);
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

  /** 范围内最近的一只活动物 id(无则 null),供近战武器索敌与联机命中结算 */
  nearestId(origin: THREE.Vector3, range: number): number | null {
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
    return best ? best.id : null;
  }

  /** 箭矢扫掠判定:返回与飞行线段平面距离最近的活动物(无则 null) */
  hitSegment(from: THREE.Vector3, to: THREE.Vector3, range: number): Animal | null {
    return nearestToSegmentXZ(this.animals, from, to, range);
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
    return this.applyDamage(best, damage);
  }

  /** 对指定动物结算一次箭伤(客人端上行的命中由房主按 id 权威结算) */
  damage(id: number, damage: number): { species: AnimalSpecies } | 'hit' | null {
    const animal = this.animals.find((a) => a.id === id);
    if (!animal?.alive) return null;
    return this.applyDamage(animal, damage);
  }

  private applyDamage(animal: Animal, damage: number): { species: AnimalSpecies } | 'hit' | null {
    animal.hp -= damage;
    if (animal.hp > 0) {
      this.creatureFx.flash(animal.model.group);
      this.onHit(animal.id);
      // 主动攻击生物受伤后立刻警戒；熊还会进入暴怒状态。
      if (animal.config.damage > 0) animal.alerted = true;
      if (animal.species === 'bear') {
        animal.rageLeft = BEAR_RAGE_TIME;
        this.roar(animal);
      }
      return 'hit';
    }
    const species = animal.species;
    animal.alive = false;
    this.creatureFx.playDeath(animal.model.group, undefined, () => this.removeAnimal(animal));
    return { species };
  }

  /** 击杀应掉落的战利品(按物种:兽肉份数不同,附带材料不同) */
  lootOf(species: AnimalSpecies): AnimalLoot {
    return SPECIES[species].loot;
  }

  /** GM 生成:在 (x,z) 附近找一块草地生成一只指定动物;鳄鱼改为在最近水洼里带出场扑咬生成 */
  gmSpawnNear(species: AnimalSpecies, x: number, z: number): boolean {
    if (species === 'crocodile') {
      const pond = this.nearestPond(x, z);
      const target = this.nearestPlayer(x, z);
      if (!pond || !target) return false;
      this.spawnCrocodile(pond, target);
      return true;
    }
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 1.5 + Math.random() * 3.5;
      const px = x + Math.cos(a) * d;
      const pz = z + Math.sin(a) * d;
      if (!this.isGrass(px, pz)) continue;
      this.createAnimal(species, new THREE.Vector3(px, this.terrain.getHeight(px, pz), pz), a + Math.PI);
      return true;
    }
    return false;
  }

  /**
   * 在水洼里生成一条鳄鱼:落点在玩家与洼心之间(确保在水中),带「潜伏→跃出扑咬」出场,
   * 咬完进入普通追击 AI;返回生成的鳄鱼。
   */
  spawnCrocodile(pond: CrocPond, target: Player): Animal {
    const p = target.group.position;
    let dx = pond.x - p.x;
    let dz = pond.z - p.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.01) {
      dx = 1;
      dz = 0;
    } else {
      dx /= len;
      dz /= len;
    }
    // 从玩家朝洼心退进水里,并夹在洼心周围 0.9 半径内
    const back = Math.min(2.5, pond.radius * 0.6);
    let x = p.x + dx * back;
    let z = p.z + dz * back;
    const cx = x - pond.x;
    const cz = z - pond.z;
    const cd = Math.hypot(cx, cz);
    const maxD = pond.radius * 0.9;
    if (cd > maxD) {
      x = pond.x + (cx / cd) * maxD;
      z = pond.z + (cz / cd) * maxD;
    }
    const animal = this.createAnimal(
      'crocodile',
      new THREE.Vector3(x, this.terrain.getHeight(x, z), z),
      Math.atan2(p.z - z, p.x - x)
    );
    animal.pond = pond;
    animal.entrance = { phase: 'lurk', left: CROC_LURK_TIME };
    return animal;
  }

  /** 联机快照:各动物的位置朝向与存活(房主侧收集;species 供客人端新建未知 id 的动物) */
  netPoses(): { id: number; x: number; z: number; h: number; alive: boolean; species: AnimalSpecies }[] {
    return this.animals.map((a) => ({
      id: a.id,
      x: a.pos.x,
      z: a.pos.z,
      h: a.heading,
      alive: a.alive,
      species: a.species,
    }));
  }

  /** 具有主动攻击能力的动物（当前为熊），联机侧用更高频率同步。 */
  netCombatPoses() {
    return this.netPoses().filter((pose) => this.animals.find((animal) => animal.id === pose.id)?.config.damage);
  }

  /** 无主动攻击能力的动物，保持普通姿态同步频率。 */
  netPassivePoses() {
    return this.netPoses().filter((pose) => !this.animals.find((animal) => animal.id === pose.id)?.config.damage);
  }

  /** 联机应用(客人侧):用房主姿态覆盖本地 AI 推出的结果,存活状态同步可见性;未知 id 且带物种时新建(GM 生成) */
  netApply(poses: { id: number; x: number; z: number; h: number; alive: boolean; species?: AnimalSpecies }[]): void {
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
      if (wasAlive && !p.alive) {
        // 房主权威判定死亡:本地立即播放倒地—停留—渐隐,而不是瞬间消失
        this.creatureFx.playDeath(a.model.group);
      }
      a.alive = p.alive;
    }
    // 房主已移除的尸体(快照缺 id):本地死亡动画播完(模型已隐藏)后清理实体
    for (let i = this.animals.length - 1; i >= 0; i--) {
      const a = this.animals[i];
      if (!a.alive && !a.model.group.visible && !map.has(a.id)) {
        this.animals.splice(i, 1);
        this.group.remove(a.model.group);
      }
    }
    // 本地没有的 id:房主新生成的动物,按快照物种补建
    for (const p of poses) {
      if (this.animals.some((a) => a.id === p.id) || !p.alive || !p.species) continue;
      const animal = this.createAnimal(p.species, new THREE.Vector3(p.x, this.terrain.getHeight(p.x, p.z), p.z), p.h);
      animal.netPos.copy(animal.pos);
      animal.netHeading = p.h;
    }
  }

  /** 客人侧:可靠事件补播受击闪红(闪红是短时表现,不进姿态快照) */
  netFlash(id: number): void {
    const animal = this.animals.find((a) => a.id === id);
    if (animal?.alive) this.creatureFx.flash(animal.model.group);
  }

  /** 客人侧由可靠网络事件立即触发熊的普通挥击，不等待下一帧姿态快照。 */
  netPlayAttack(id: number): void {
    const animal = this.animals.find((candidate) => candidate.id === id);
    if (!animal?.alive) return;
    animal.lungeLeft = 0.35;
  }

  /** 客人端只平滑权威姿态并播放视觉动画，不运行 AI 或伤害结算。 */
  netUpdate(delta: number, elapsed: number): void {
    this.creatureFx.update(delta);
    const k = 1 - Math.exp(-14 * delta);
    for (const a of this.animals) {
      if (!a.alive) continue;
      a.lungeLeft = Math.max(0, a.lungeLeft - delta);
      const beforeX = a.pos.x;
      const beforeZ = a.pos.z;
      a.pos.lerp(a.netPos, k);
      const diff = Math.atan2(Math.sin(a.netHeading - a.heading), Math.cos(a.netHeading - a.heading));
      a.heading += diff * k;
      const moving = Math.hypot(a.pos.x - beforeX, a.pos.z - beforeZ) > 0.0001;
      this.animate(a, delta, elapsed, moving, false);
    }
  }

}
