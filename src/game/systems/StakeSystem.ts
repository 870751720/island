import * as THREE from 'three';
import { Stake, type StakeSave } from '../entities/Stake';
import type { IslandTerrain } from '../world/IslandTerrain';
import { WorldEntityIds, type EntityChangeSink } from './WorldEntityId';

const NEAR_RANGE = 2.2; // 玩家距桩小于该值时算在桩旁(解绳按钮判定)

/**
 * 拴羊桩系统(世界共享):牵着羊点工具按钮在玩家脚下打桩,把羊拴住;
 * 靠近桩点「解开套索」连桩一起拆掉,套索收回背包。
 * 桩不入锄头挖掘流程(拆桩即解绳,走动作按钮),存档与世界增量按落点同步。
 */
export class StakeSystem {
  private stakes: Stake[] = [];
  private ids = new WorldEntityIds<Stake>('stake');
  private onChanged?: EntityChangeSink;
  setChangeSink(sink?: EntityChangeSink): void {
    this.onChanged = sink;
  }

  constructor(private scene: THREE.Scene, private terrain: IslandTerrain) {}

  /** 在 (x,z) 打一根桩(地面高度自动贴地),返回新桩 */
  place(x: number, z: number): Stake {
    const stake = new Stake(this.scene, new THREE.Vector3(x, this.terrain.getHeight(x, z), z));
    this.stakes.push(stake);
    const p = stake.group.position;
    const id = this.ids.get(stake);
    this.onChanged?.({ op: 'add', id, value: { id, x: p.x, y: p.y, z: p.z } });
    return stake;
  }

  /** 拆掉一根桩(解绳时调用);桩不存在返回 false */
  remove(stake: Stake): boolean {
    const index = this.stakes.indexOf(stake);
    if (index < 0) return false;
    this.stakes.splice(index, 1);
    this.onChanged?.({ op: 'remove', id: this.ids.get(stake) });
    this.scene.remove(stake.group);
    return true;
  }

  /** 距 (x,z) 最近的桩(范围内),无则 null */
  nearest(x: number, z: number, range = NEAR_RANGE): Stake | null {
    let best: Stake | null = null;
    let bestDist = range * range;
    for (const stake of this.stakes) {
      const p = stake.group.position;
      const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
      if (d < bestDist) {
        best = stake;
        bestDist = d;
      }
    }
    return best;
  }

  /** 场上所有桩落点 */
  get positions(): { x: number; z: number }[] {
    return this.stakes.map((s) => ({ x: s.group.position.x, z: s.group.position.z }));
  }

  /** 当前所有桩的存档快照 */
  snapshot(): StakeSave[] {
    return this.stakes.map((stake) => {
      const p = stake.group.position;
      return { id: this.ids.get(stake), x: p.x, y: p.y, z: p.z };
    });
  }

  /** 从存档恢复全部桩 */
  restore(list: StakeSave[]): void {
    for (const s of list) {
      const stake = new Stake(this.scene, new THREE.Vector3(s.x, s.y, s.z));
      this.ids.set(stake, s.id);
      this.stakes.push(stake);
    }
  }

  /** 清空场上全部桩(客人侧重放世界快照前调用) */
  clear(): void {
    for (const stake of this.stakes) this.scene.remove(stake.group);
    this.stakes = [];
  }

  /** 客人侧:按房主世界快照对账(按 id 增删) */
  netApply(list: StakeSave[]): void {
    const incoming = new Map(list.filter((x) => x.id).map((x) => [x.id!, x]));
    for (let i = this.stakes.length - 1; i >= 0; i--) {
      if (incoming.has(this.ids.get(this.stakes[i]))) continue;
      this.scene.remove(this.stakes[i].group);
      this.stakes.splice(i, 1);
    }
    const current = new Map(this.stakes.map((stake) => [this.ids.get(stake), stake]));
    for (const value of list) {
      if (value.id && current.has(value.id)) continue;
      const stake = new Stake(this.scene, new THREE.Vector3(value.x, value.y, value.z));
      this.ids.set(stake, value.id);
      this.stakes.push(stake);
    }
  }
}
