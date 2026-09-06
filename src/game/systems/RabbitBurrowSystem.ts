import * as THREE from 'three';
import { hoeHits } from './ToolTiers';
import { RabbitBurrow } from '../entities/RabbitBurrow';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Particles } from '../fx/Particles';
import type { PlayerSession } from '../mp/PlayerSession';
import { WorldEntityIds, type EntityChangeSink } from './WorldEntityId';
import { ActionHold } from './ActionHold';

const DIG_RANGE = 1.6; // 持锄头可开挖兔子洞的距离
const SWING_TIME = 0.6; // 每次挖掘动作时长(秒)
/** 兔子栖息地草面最低高度:与 Wildlife 的草地判定一致,洞只出现在草地上 */
const GRASS_MIN = 0.16;
/** 每个兔子栖息地生成的洞数 */
const PER_HABITAT = [1, 2];
/** 洞的生成/重生半径:在栖息地中心这个范围内找草地落点 */
const SPREAD = 9;
/** 挖废后重新塌出新洞的等待(秒):约 1~2 个昼夜 */
const RESPAWN_TIME: [number, number] = [240, 480];

/** 兔子洞存档/网络快照(落点与状态;respawnLeft 仅入档,不下发) */
export type RabbitBurrowSave = {
  id?: string;
  x: number;
  y: number;
  z: number;
  state: 'intact' | 'abandoned';
  respawnLeft?: number;
};

/** 每玩家的挖掘进度(世界里的洞是共享的,进度各自算) */
type DigState = { hold: ActionHold; swingTimer: number; hits: number; digTarget: RabbitBurrow | null };

type BurrowRecord = {
  burrow: RabbitBurrow;
  /** 洞所属栖息地中心,废弃后在其附近重新塌出新洞 */
  home: { x: number; z: number };
  /** 废弃后重新塌出新洞的剩余时间(秒),仅权威端推进 */
  respawnLeft: number;
};

/**
 * 兔子洞系统(野外的场景实体,不进背包、不可搬运):
 * - 每个兔子栖息地生成 1~2 个洞,是栖息地里兔子共同的避难所;
 * - 手持锄头靠近完好洞站定自动挖掘,挖开后藏在内的兔子被塌方压死,
 *   洞变废弃不再提供庇护,过 1~2 个昼夜在附近重新塌出一个新洞。
 */
export class RabbitBurrowSystem {
  private records: BurrowRecord[] = [];
  private scratch = new THREE.Vector3();
  private ids = new WorldEntityIds<RabbitBurrow>('rabbitBurrow');
  private onChanged?: EntityChangeSink;
  private digStates = new Map<PlayerSession, DigState>();

  setChangeSink(sink?: EntityChangeSink): void {
    this.onChanged = sink;
  }

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    private fx: Particles,
    /** 洞被挖开:藏在内的兔子塌方压死,由游戏侧结算掉落 */
    private onDig: (x: number, z: number) => void,
    /** 其他占用双手的行为(如合成/采集中),为真时挖掘让位 */
    private isBusy: (actor: PlayerSession) => boolean = () => false
  ) {}

  private st(actor: PlayerSession): DigState {
    let st = this.digStates.get(actor);
    if (!st) {
      st = { hold: new ActionHold(), swingTimer: 0, hits: 0, digTarget: null };
      this.digStates.set(actor, st);
    }
    return st;
  }

  /** 移除会话时清理其个人挖掘进度 */
  detach(actor: PlayerSession): void {
    this.digStates.delete(actor);
  }

  /** 某点是否为可落洞的草地(与动物的站立判定同源) */
  private isGrass(x: number, z: number): boolean {
    if (Math.abs(x) > this.terrain.halfWidth - 2 || Math.abs(z) > this.terrain.halfLength - 2) return false;
    const y = this.terrain.getHeight(x, z);
    return y >= GRASS_MIN && y >= this.terrain.getWaterLevel(x, z) - 0.02;
  }

  /** 在 (cx,cz) 附近找一块草地落点(找不到返回 null) */
  private findSpot(cx: number, cz: number, rng: () => number, spread = SPREAD): { x: number; z: number } | null {
    for (let i = 0; i < 40; i++) {
      const a = rng() * Math.PI * 2;
      const d = 2 + Math.sqrt(rng()) * spread;
      const x = cx + Math.cos(a) * d;
      const z = cz + Math.sin(a) * d;
      if (!this.isGrass(x, z)) continue;
      if (this.records.some((r) => Math.hypot(x - r.burrow.group.position.x, z - r.burrow.group.position.z) < 4)) continue;
      return { x, z };
    }
    return null;
  }

  private add(home: { x: number; z: number }, x: number, z: number, respawnLeft = 0): RabbitBurrow {
    const burrow = new RabbitBurrow(this.scene, new THREE.Vector3(x, this.terrain.getHeight(x, z), z));
    this.records.push({ burrow, home, respawnLeft });
    const id = this.ids.get(burrow);
    this.onChanged?.({ op: 'add', id, value: { id, x, y: burrow.group.position.y, z, state: 'intact' } });
    return burrow;
  }

  private remove(record: BurrowRecord): void {
    this.records.splice(this.records.indexOf(record), 1);
    this.onChanged?.({ op: 'remove', id: this.ids.get(record.burrow) });
    this.scene.remove(record.burrow.group);
  }

  /** 开局生成:每个兔子栖息地 1~2 个洞(权威端生成,客人由世界快照补建) */
  generateFor(homes: { x: number; z: number }[], rng: () => number = Math.random): void {
    for (const home of homes) {
      const count = PER_HABITAT[0] + Math.floor(rng() * (PER_HABITAT[1] - PER_HABITAT[0] + 1));
      for (let i = 0; i < count; i++) {
        const spot = this.findSpot(home.x, home.z, rng);
        if (spot) this.add(home, spot.x, spot.z);
      }
    }
  }

  /** 距 (x,z) 最近的完好洞(超过 range 不算),供兔子受惊时寻路回家 */
  nearestIntact(x: number, z: number, range: number): { x: number; z: number } | null {
    let best: { x: number; z: number } | null = null;
    let bestDist = range * range;
    for (const r of this.records) {
      if (r.burrow.state !== 'intact') continue;
      const p = r.burrow.group.position;
      const d = (x - p.x) ** 2 + (z - p.z) ** 2;
      if (d < bestDist) {
        best = { x: p.x, z: p.z };
        bestDist = d;
      }
    }
    return best;
  }

  /** 权威端:推进废弃洞的重生;客人端只保持表现(当前无逐帧表现,留空) */
  update(delta: number, authority: boolean): void {
    if (!authority) return;
    for (const r of [...this.records]) {
      if (r.burrow.state !== 'abandoned') continue;
      r.respawnLeft -= delta;
      if (r.respawnLeft > 0) continue;
      // 在原洞附近重新塌出一个新洞;找不到落点就稍后再试
      const spot = this.findSpot(r.burrow.group.position.x, r.burrow.group.position.z, Math.random, 5);
      if (!spot) {
        r.respawnLeft = 30;
        continue;
      }
      const home = r.home;
      this.remove(r);
      this.add(home, spot.x, spot.z);
    }
  }

  /** 正在挖兔子洞 */
  isDigging(actor: PlayerSession): boolean {
    return !!this.digStates.get(actor)?.digTarget;
  }

  /** 手持锄头站定在完好洞旁自动挖掘,命中数次后挖开:藏在内的兔子压死,洞变废弃;帧末统一提交持有的动作,挖掘结束自动释放 */
  updateActor(actor: PlayerSession, delta: number): void {
    const st = this.st(actor);
    try {
      const p = actor.player.group.position;
      let target: RabbitBurrow | null = null;
      if (actor.player.currentTool === 'hoe' && !actor.player.isSwimming && !this.isBusy(actor)) {
        for (const r of this.records) {
          if (r.burrow.state !== 'intact') continue;
          this.scratch.copy(r.burrow.group.position);
          this.scratch.y = p.y;
          if (this.scratch.distanceTo(p) < DIG_RANGE) {
            target = r.burrow;
            break;
          }
        }
      }
      if (!target || actor.player.isMoving) {
        st.digTarget = null;
        st.swingTimer = 0;
        st.hits = 0;
        return;
      }
      st.digTarget = target;
      st.hold.hold(actor.player, 'mine');
      st.swingTimer += delta;
      if (st.swingTimer < SWING_TIME) return;
      st.swingTimer = 0;
      this.fx.burst(target.group.position, '#8a6f4d', 6);
      st.hits += 1;
      if (st.hits < hoeHits(actor.tools.hoe)) return;
      st.hits = 0;
      st.digTarget = null;
      // 挖开:藏在内的兔子被塌方压死,洞口塌成废弃状态
      const pp = target.group.position;
      this.onDig(pp.x, pp.z);
      target.abandon();
      const record = this.records.find((r) => r.burrow === target)!;
      record.respawnLeft = RESPAWN_TIME[0] + Math.random() * (RESPAWN_TIME[1] - RESPAWN_TIME[0]);
      this.onChanged?.({
        op: 'set',
        id: this.ids.get(target),
        fields: { state: 'abandoned' },
      });
      this.fx.burst(pp, '#8a6f4d', 14);
    } finally {
      st.hold.commit(actor.player);
    }
  }

  /** 当前挖掘进度 0-1,未在挖掘时为 null */
  getDigProgress(actor: PlayerSession): number | null {
    const st = this.digStates.get(actor);
    if (!st?.digTarget) return null;
    const need = hoeHits(actor.tools.hoe);
    return Math.min((st.hits + st.swingTimer / SWING_TIME) / need, 1);
  }

  /** 所有洞的存档快照(含重生倒计时) */
  snapshot(): RabbitBurrowSave[] {
    return this.records.map((r) => {
      const p = r.burrow.group.position;
      return {
        id: this.ids.get(r.burrow),
        x: p.x,
        y: p.y,
        z: p.z,
        state: r.burrow.state,
        ...(r.burrow.state === 'abandoned' ? { respawnLeft: r.respawnLeft } : {}),
      };
    });
  }

  /** 网络快照:连续倒计时不入网络比较 */
  netSnapshot(): RabbitBurrowSave[] {
    return this.snapshot().map(({ respawnLeft: _, ...save }) => save);
  }

  /** 清空场上全部兔子洞(恢复存档前调用) */
  clear(): void {
    for (const r of this.records) this.scene.remove(r.burrow.group);
    this.records = [];
  }

  /** 从存档恢复全部兔子洞 */
  restore(list: RabbitBurrowSave[]): void {
    this.clear();
    for (const s of list) {
      const burrow = new RabbitBurrow(this.scene, new THREE.Vector3(s.x, s.y, s.z));
      if (s.state === 'abandoned') burrow.abandon();
      this.ids.set(burrow, s.id);
      this.records.push({
        burrow,
        // 家锚点用洞自身位置:重生时就在原洞附近找新落点
        home: { x: s.x, z: s.z },
        respawnLeft: s.respawnLeft ?? RESPAWN_TIME[0],
      });
    }
  }

  /** 客人端按稳定 id 原地增删与状态同步 */
  netApply(list: RabbitBurrowSave[]): void {
    const incoming = new Map(list.filter((x) => x.id).map((x) => [x.id!, x]));
    for (let i = this.records.length - 1; i >= 0; i--) {
      const r = this.records[i];
      const save = incoming.get(this.ids.get(r.burrow));
      if (!save) {
        this.scene.remove(r.burrow.group);
        this.records.splice(i, 1);
        continue;
      }
      // 权威端挖废时下发 set state=abandoned;重生新洞走 add/remove,不存在「废弃复原」
      if (save.state === 'abandoned' && r.burrow.state !== 'abandoned') r.burrow.abandon();
    }
    for (const value of list) {
      if (value.id && this.records.some((r) => this.ids.get(r.burrow) === value.id)) continue;
      const burrow = new RabbitBurrow(this.scene, new THREE.Vector3(value.x, value.y, value.z));
      if (value.state === 'abandoned') burrow.abandon();
      this.ids.set(burrow, value.id);
      this.records.push({ burrow, home: { x: value.x, z: value.z }, respawnLeft: 0 });
    }
  }
}
