import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import { IslandTerrain } from '../world/IslandTerrain';
import { ANIMAL_BUILDERS } from './WildlifeModels';
import type { ResourceKind } from '../systems/Inventory';

export type AnimalSpecies = 'rabbit' | 'sheep' | 'deer' | 'bear';

/** 击杀掉落的战利品(兽肉之外按物种附带不同材料) */
export type AnimalLoot = { kind: ResourceKind; count: number }[];

/** 草地高度带:高于沙滩带上限算草地,动物只在草地上活动 */
const GRASS_MIN = 0.16;
/** 玩家死后 / 游泳时不再触发受击与追击 */
const DAY_RESPAWN = 40;
const BEAR_RESPAWN = 90;

type SpeciesConfig = {
  label: string;
  count: number;
  /** 平时游荡速度 */
  walkSpeed: number;
  /** 被玩家靠近时的逃跑速度(熊为追击速度) */
  rushSpeed: number;
  /** 玩家靠到这个距离内触发逃跑/追击 */
  senseRange: number;
  /** 熊追击丢失玩家后回到游荡的距离 */
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
    deaggroRange: 0,
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
    deaggroRange: 0,
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
    deaggroRange: 0,
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
    rushSpeed: 2.4,
    senseRange: 5,
    deaggroRange: 12,
    attackRange: 1.3,
    damage: 15,
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
  species: AnimalSpecies;
  config: SpeciesConfig;
  model: ReturnType<(typeof ANIMAL_BUILDERS)[AnimalSpecies]>;
  pos: THREE.Vector3;
  target: THREE.Vector3;
  heading: number;
  walkTime: number;
  idleTime: number;
  phase: number;
  hp: number;
  alive: boolean;
  respawnLeft: number;
  attackLeft: number;
  /** 扑击动画计时(>0 时头部前顶) */
  lungeLeft: number;
};

/**
 * 草地上的野生动物:兔、羊、鹿见玩家靠近就逃;熊会追击并扑击玩家。
 * 都可用弓箭猎捕,倒下后掉落兽肉,隔段时间在岛上别处重新刷新。
 */
export class Wildlife implements Updatable {
  readonly group = new THREE.Group();
  private animals: Animal[] = [];

  constructor(
    scene: THREE.Scene,
    private terrain: IslandTerrain,
    private player: { group: THREE.Group },
    /** 熊扑击命中玩家时造成伤害(游戏侧负责掉血与特效) */
    private onPlayerHit: (damage: number) => void,
    /** 玩家当前是否可被攻击(死亡时不追击) */
    private isPlayerVulnerable: () => boolean,
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
        this.animals.push({
          species,
          config,
          model,
          pos: spawn.clone(),
          target: spawn.clone(),
          heading: rng() * Math.PI * 2,
          walkTime: 0,
          idleTime: rng() * 4,
          phase: rng() * Math.PI * 2,
          hp: config.hp,
          alive: true,
          respawnLeft: 0,
          attackLeft: 0,
          lungeLeft: 0,
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

  /** 在岛上随机撒点找一处草地(离玩家远一点,避免刷新在脸上) */
  private findGrassSpot(rng: () => number): THREE.Vector3 | null {
    const maxR = this.terrain.size / 2 - 3;
    const p = this.player.group.position;
    for (let i = 0; i < 40; i++) {
      const a = rng() * Math.PI * 2;
      const r = 4 + rng() * (maxR - 4);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (!this.isGrass(x, z)) continue;
      if (Math.hypot(x - p.x, z - p.z) < 8) continue;
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
    const p = this.player.group.position;
    const vulnerable = this.isPlayerVulnerable();
    for (const animal of this.animals) {
      if (!animal.alive) {
        animal.respawnLeft -= delta;
        if (animal.respawnLeft <= 0) this.respawn(animal);
        continue;
      }
      const dist = Math.hypot(p.x - animal.pos.x, p.z - animal.pos.z);
      const hostile = animal.species === 'bear';
      const rushed = hostile
        ? dist < animal.config.deaggroRange && (dist < animal.config.senseRange || animal.hp < animal.config.hp) && vulnerable
        : dist < animal.config.senseRange;

      animal.walkTime += delta;
      animal.attackLeft = Math.max(0, animal.attackLeft - delta);
      animal.lungeLeft = Math.max(0, animal.lungeLeft - delta);

      let moving = false;
      if (rushed && hostile && dist <= animal.config.attackRange) {
        // 扑击:面向玩家原地挥击,冷却好才真正造成伤害
        animal.heading = Math.atan2(p.z - animal.pos.z, p.x - animal.pos.x);
        if (animal.attackLeft <= 0) {
          animal.attackLeft = animal.config.attackCooldown;
          animal.lungeLeft = 0.35;
          this.onPlayerHit(animal.config.damage);
        }
      } else if (rushed) {
        // 逃跑(草食)/ 追击(熊):沿与玩家相对方向全速移动
        const away = Math.atan2(animal.pos.z - p.z, animal.pos.x - p.x);
        const angle = hostile ? away + Math.PI : away;
        moving = this.step(animal, angle, animal.config.rushSpeed, delta);
      } else if (animal.idleTime > 0) {
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

      this.animate(animal, elapsed, moving, rushed);
    }
  }

  /** 应用位置朝向;移动时对角迈腿,受惊/追击时加快频率,熊扑击时头部前顶 */
  private animate(animal: Animal, elapsed: number, moving: boolean, excited: boolean): void {
    const g = animal.model.group;
    g.position.copy(animal.pos);
    // 兔子蹦着走:移动时整体做抛物线小跳,四腿收起
    const hop = animal.species === 'rabbit';
    if (hop && moving) {
      g.position.y += Math.abs(Math.sin(elapsed * (excited ? 13 : 8) + animal.phase)) * 0.24;
    }
    // 模型面朝 +Z,朝向按移动方向角换算
    g.rotation.y = Math.PI / 2 - animal.heading;

    const speed = moving ? (excited ? 12 : 6) : 0;
    animal.model.legs.forEach((leg, i) => {
      // 前左/后右一组,前右/后左一组,交替摆动
      const pair = i === 0 || i === 3 ? 0 : Math.PI;
      const swing = Math.sin(elapsed * speed + animal.phase + pair);
      leg.rotation.x = moving && !hop ? swing * 0.6 : 0;
    });
    // 头颈:平时轻晃,熊扑击瞬间向前顶
    const bob = animal.lungeLeft > 0 ? 0.28 : Math.sin(elapsed * 2 + animal.phase) * 0.04;
    animal.model.head.position.z = (animal.species === 'bear' ? 0.48 : animal.species === 'deer' ? 0.34 : animal.species === 'rabbit' ? 0.22 : 0.4) + bob;
    animal.model.head.rotation.x = animal.lungeLeft > 0 ? -0.4 : 0;
    // 尾巴轻摆
    animal.model.tail.rotation.y = Math.sin(elapsed * 3 + animal.phase) * 0.3;
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
    if (best.hp > 0) return 'hit';
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
    animal.alive = true;
    animal.model.group.visible = true;
  }
}
