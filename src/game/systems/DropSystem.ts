import * as THREE from 'three';
import { animalFood, type FoodTarget } from './AnimalFood';
import type { FoodEater } from './Food';
import { DropHighlight } from '../fx/DropHighlight';
import type { ResourceKind } from './Inventory';
import type { Actor } from '../mp/Actor';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import { DROP_COLORS, makeDropModel } from './DropModels';
import { createWorldEntityId, type EntityChangeSink } from './WorldEntityId';
import { findNearestDryPoint } from '../world/NearestDryPoint';

const DROP_LIFETIME_MS = 10 * 60 * 1000;

const PICKUP_RANGE = 1.6; // 玩家距掉落物该距离内时出现「捡回」卡片
const PICKUP_DELAY = 0.5; // 丢弃后短暂不可捡回,避免刚丢就提示
const DOG_EAT_DELAY = 4; // 狗狗只吃落地超过这么久的食物,给玩家捡回的机会
const BOB_HEIGHT = 0.15; // 悬浮上下浮动幅度
const SPIN_SPEED = 1.6; // 旋转速度(弧度/秒)

/** 掉落物来源:玩家主动丢弃 / 击杀动物掉落 / 背包放不下溢出 */
export type DropSource = 'discarded' | 'loot' | 'overflow';

/** 掉落物的持久化/同步形态(存档、世界增量与客人镜像共用) */
export type DropEntry = {
  id?: string;
  /** 现实时间到期时间戳（毫秒）；旧档缺省为恢复后十分钟 */
  expiresAt?: number;
  kind: ResourceKind;
  count: number;
  x: number;
  z: number;
  source: DropSource;
  /** 工具类掉落物携带的等级(1 基础/2 石制/3 铁制),非工具无此字段 */
  tier?: number;
};

export type DropInfo = {
  kind: ResourceKind;
  count: number;
  source: DropSource;
  /** 工具类掉落物的等级(非工具为 undefined) */
  tier?: number;
  /** 掉落物当前位置(入包飞行表现等用,引用自掉落物网格) */
  position: THREE.Vector3;
};

type Drop = {
  /** 同步用短 id(房主递增分配,拾取时按 id 通知客人移除) */
  id: string;
  kind: ResourceKind;
  count: number;
  source: DropSource;
  /** 工具类掉落物的等级,非工具为 undefined */
  tier?: number;
  mesh: THREE.Object3D;
  age: number;
  expiresAt: number;
  baseY: number;
};

/** 地面掉落物:掉落的道具以各自专属造型落在玩家附近,旋转悬浮;靠近后出现「捡回」卡片,点击才拾回背包 */
export class DropSystem {
  private drops: Drop[] = [];
  private highlight = new DropHighlight();
  private scratch = new THREE.Vector3();

  hasKind(kind: ResourceKind): boolean {
    return this.drops.some((drop) => drop.kind === kind);
  }

  private onChanged?: EntityChangeSink;

  setChangeSink(sink?: EntityChangeSink): void { this.onChanged = sink; }

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    private fx: Particles,
    private audio: GameAudio,
    private authoritative = true
  ) {}

  /** 在玩家附近丢弃道具(带随机偏移,避免叠在角色脚下;工具可带等级) */
  drop(kind: ResourceKind, count: number, actor: Actor, tier?: number): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.7 + Math.random() * 0.5;
    const p = actor.player.group.position;
    this.spawn(
      kind,
      count,
      'discarded',
      p.x + Math.cos(angle) * radius,
      p.z + Math.sin(angle) * radius,
      tier
    );
  }

  /** 每次死亡共用一个岸边落点；每件物品散落后仍须位于干地。 */
  deathDropper(actor: Actor): (kind: ResourceKind, count: number) => void {
    const origin = actor.player.group.position;
    const isDry = (x: number, z: number) =>
      this.terrain.getHeight(x, z) >= this.terrain.getWaterLevel(x, z) + 0.05;
    const point = findNearestDryPoint(
      origin, this.terrain.halfWidth, this.terrain.halfLength, isDry,
      () => this.terrain.findSpawnPoint(),
    );
    return (kind, count) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.7 + Math.random() * 0.5;
      const x = point.x + Math.cos(angle) * radius;
      const z = point.z + Math.sin(angle) * radius;
      const dry = isDry(x, z);
      this.spawn(kind, count, 'discarded', dry ? x : point.x, dry ? z : point.z);
    };
  }

  /** 背包放不下溢出到玩家附近(与主动丢弃区分来源) */
  dropOverflow(kind: ResourceKind, count: number, actor: Actor): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.7 + Math.random() * 0.5;
    const p = actor.player.group.position;
    this.spawn(
      kind,
      count,
      'overflow',
      p.x + Math.cos(angle) * radius,
      p.z + Math.sin(angle) * radius
    );
  }

  /** 在指定坐标掉落道具(狩猎战利品等),同样走「捡回」卡片拾取 */
  dropAt(kind: ResourceKind, count: number, x: number, z: number): void {
    this.spawn(kind, count, 'loot', x, z);
  }

  private spawn(
    kind: ResourceKind,
    count: number,
    source: DropSource,
    x: number,
    z: number,
    tier?: number
  ): void {
    const mesh = makeDropModel(kind);
    this.highlight.apply(mesh);
    const baseY = Math.max(this.terrain.getHeight(x, z), 0) + 0.5;
    mesh.position.set(x, baseY, z);
    this.scene.add(mesh);
    const id = createWorldEntityId('drop');
    const expiresAt = Date.now() + DROP_LIFETIME_MS;
    this.drops.push({ id, kind, count, source, tier, mesh, age: 0, expiresAt, baseY });
    this.onChanged?.({
      op: 'add',
      id,
      value: { id, kind, count, source, x, z, expiresAt, ...(tier !== undefined ? { tier } : {}) },
    });
    this.audio.play('drop');
  }

  update(delta: number, elapsed: number): void {
    if (this.authoritative) {
      const now = Date.now();
      for (let i = this.drops.length - 1; i >= 0; i--) {
        if (this.drops[i].expiresAt <= now) this.remove(i);
      }
    }
    this.highlight.update(elapsed);
    for (let i = 0; i < this.drops.length; i++) {
      const drop = this.drops[i];
      drop.age += delta;
      drop.mesh.rotation.y += SPIN_SPEED * delta;
      drop.mesh.position.y = drop.baseY + Math.sin(elapsed * 3 + i) * BOB_HEIGHT;
    }
  }

  /** 玩家附近可捡回的掉落物(丢弃后马上不可见,避免刚丢就提示) */
  getNearby(actor: Actor): DropInfo | null {
    const p = actor.player.group.position;
    let nearest: Drop | null = null;
    for (const drop of this.drops) {
      if (drop.age < PICKUP_DELAY) continue;
      this.scratch.copy(drop.mesh.position);
      if (this.scratch.distanceTo(p) >= PICKUP_RANGE) continue;
      if (!nearest || drop.age > nearest.age) nearest = drop;
    }
    return nearest
      ? {
          kind: nearest.kind,
          count: nearest.count,
          source: nearest.source,
          tier: nearest.tier,
          position: nearest.mesh.position,
        }
      : null;
  }

  /** 捡回附近掉落物;收集回调返回实际收下数量(默认入背包),收不满时返回 false 掉落物留在地上 */
  pickupNearby(
    actor: Actor,
    collect: (drop: { kind: ResourceKind; count: number; tier?: number }) => number = (d) =>
      actor.inventory.add(d.kind, d.count)
  ): boolean {
    const p = actor.player.group.position;
    for (let i = 0; i < this.drops.length; i++) {
      const drop = this.drops[i];
      if (drop.age < PICKUP_DELAY) continue;
      this.scratch.copy(drop.mesh.position);
      if (this.scratch.distanceTo(p) >= PICKUP_RANGE) continue;
      if (collect({ kind: drop.kind, count: drop.count, tier: drop.tier }) < drop.count) return false;
      this.fx.burst(drop.mesh.position, DROP_COLORS[drop.kind], 8);
      this.remove(i);
      return true;
    }
    return false;
  }

  foodTargets(eater: FoodEater, origin: THREE.Vector3, range: number): FoodTarget[] {
    return this.drops.filter(drop => drop.source === 'discarded' && drop.age >= DOG_EAT_DELAY
      && animalFood(drop.kind, eater) && Math.hypot(drop.mesh.position.x - origin.x, drop.mesh.position.z - origin.z) <= range)
      .map(drop => ({ position: drop.mesh.position.clone(), consume: () => {
        const index = this.drops.indexOf(drop);
        if (index < 0 || drop.count <= 0) return 0;
        const food = animalFood(drop.kind, eater);
        if (!food) return 0;
        drop.count--;
        if (!drop.count) this.remove(index);
        else this.onChanged?.({ op: 'set', id: drop.id, fields: { count: drop.count } });
        return food.hunger;
      } }));
  }

  private remove(index: number): void {
    const drop = this.drops[index];
    this.onChanged?.({ op: 'remove', id: drop.id });
    this.scene.remove(drop.mesh);
    drop.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
    this.drops.splice(index, 1);
  }

  /** 当前所有地面掉落物的存档快照 */
  snapshot(): DropEntry[] {
    return this.drops.map((drop) => ({
      id: drop.id,
      expiresAt: drop.expiresAt,
      kind: drop.kind,
      count: drop.count,
      source: drop.source,
      x: drop.mesh.position.x,
      z: drop.mesh.position.z,
      ...(drop.tier !== undefined ? { tier: drop.tier } : {}),
    }));
  }

  /** 从存档恢复掉落物(不播丢落音效) */
  restore(list: DropEntry[]): void {
    const now = Date.now();
    for (const d of list) {
      const expiresAt = d.expiresAt ?? now + DROP_LIFETIME_MS;
      if (d.count <= 0 || (this.authoritative && expiresAt <= now)) continue;
      const mesh = makeDropModel(d.kind);
      this.highlight.apply(mesh);
      const baseY = Math.max(this.terrain.getHeight(d.x, d.z), 0) + 0.5;
      mesh.position.set(d.x, baseY, d.z);
      this.scene.add(mesh);
      this.drops.push({ id: d.id ?? createWorldEntityId('drop'), kind: d.kind, count: d.count, source: d.source, tier: d.tier, mesh, age: 0, expiresAt, baseY });
    }
  }

  netApply(list: DropEntry[]): void {
    const incoming = new Map(list.filter((x) => x.id).map((x) => [x.id!, x]));
    for (let i = this.drops.length - 1; i >= 0; i--) {
      if (incoming.has(this.drops[i].id)) continue;
      this.remove(i);
    }
    const current = new Map(this.drops.map((drop) => [drop.id, drop]));
    for (const value of list) {
      const existing = value.id ? current.get(value.id) : undefined;
      if (existing) {
        existing.count = value.count;
        existing.expiresAt = value.expiresAt ?? existing.expiresAt;
        continue;
      }
      const mesh = makeDropModel(value.kind);
      this.highlight.apply(mesh);
      const baseY = Math.max(this.terrain.getHeight(value.x, value.z), 0) + 0.5;
      mesh.position.set(value.x, baseY, value.z);
      this.scene.add(mesh);
      this.drops.push({ id: value.id || createWorldEntityId('drop'), kind: value.kind, count: value.count, source: value.source, tier: value.tier, mesh, age: 0, expiresAt: value.expiresAt ?? Date.now() + DROP_LIFETIME_MS, baseY });
    }
  }

  dispose(): void {
    for (let i = this.drops.length - 1; i >= 0; i--) this.remove(i);
  }
}
