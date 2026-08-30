import * as THREE from 'three';
import type { Player } from '../entities/Player';
import { Crate } from '../entities/Crate';
import type { Inventory, InventorySlot, ResourceKind } from './Inventory';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';

const PROP_BLOCK_RANGE = 1; // 周围资源点距离小于该值时无处摆放
const CRATE_BLOCK_RANGE = 0.8; // 与其他木箱/重叠距离小于该值时无处摆放
const NEAR_RANGE = 2.2; // 玩家距木箱小于该值时算在木箱旁

/**
 * 木箱系统:背包里点击「使用」木箱,校验通过后在玩家脚下原地放下
 * (与工作台摆放同一套规则:不能在水里/水边,脚下不能被资源点或其他木箱占住)。
 * 木箱自带 10 格收纳,靠近后可整格存入背包物品或取回。
 */
export class CrateSystem {
  private crates: Crate[] = [];
  private scratch = new THREE.Vector3();

  constructor(
    private scene: THREE.Scene,
    private player: Player,
    private inventory: Inventory,
    private terrain: IslandTerrain,
    private props: Props,
    private fx: Particles,
    private audio: GameAudio
  ) {}

  /** 玩家身旁最近的木箱(范围内的),无则 null */
  get nearby(): Crate | null {
    let best: Crate | null = null;
    let bestDist = NEAR_RANGE * NEAR_RANGE;
    for (const crate of this.crates) {
      this.scratch.copy(crate.group.position);
      this.scratch.y = this.player.group.position.y;
      const d = this.scratch.distanceToSquared(this.player.group.position);
      if (d < bestDist) {
        best = crate;
        bestDist = d;
      }
    }
    return best;
  }

  /** 当前位置是否允许摆放(不在水里/水边,脚下没有被资源点或其他木箱占住) */
  private canPlace(): boolean {
    const p = this.player.group.position;
    if (this.player.isSwimming) return false;
    if (this.terrain.isNearWater(p, 1)) return false;
    if (this.terrain.getHeight(p.x, p.z) <= 0) return false;
    if (
      this.crates.some((crate) => {
        this.scratch.copy(crate.group.position);
        return this.scratch.distanceTo(p) < CRATE_BLOCK_RANGE;
      })
    ) {
      return false;
    }
    return !this.props.isOccupied(p, PROP_BLOCK_RANGE);
  }

  /** 背包里点击「使用」木箱:校验通过后在玩家脚下原地放下 */
  use(): boolean {
    if (this.inventory.count('crate') <= 0 || !this.canPlace()) return false;
    this.inventory.remove('crate', 1);
    this.crates.push(new Crate(this.scene, this.player.group.position));
    this.audio.play('success');
    const fxPos = this.player.group.position.clone();
    fxPos.y += 0.5;
    this.fx.burst(fxPos, '#a97b48', 10);
    return true;
  }

  /** 身旁木箱的格子快照(不在木箱旁为 null) */
  nearbySlots(): InventorySlot[] | null {
    return this.nearby?.storage.snapshot() ?? null;
  }

  /** 把背包里该种类全部道具整格存入身旁木箱,返回是否存入任何数量 */
  store(kind: ResourceKind): boolean {
    const crate = this.nearby;
    const n = this.inventory.count(kind);
    if (!crate || n <= 0 || !crate.storage.canFit(kind)) return false;
    this.inventory.remove(kind, n);
    crate.storage.add(kind, n);
    this.audio.play('drop');
    return true;
  }

  /** 把身旁木箱里该种类全部道具整格取回背包,返回是否取回任何数量 */
  take(kind: ResourceKind): boolean {
    const crate = this.nearby;
    const n = crate ? crate.storage.count(kind) : 0;
    if (!crate || n <= 0 || !this.inventory.canFit(kind)) return false;
    crate.storage.remove(kind, n);
    this.inventory.add(kind, n);
    this.audio.play('pickup');
    return true;
  }

  /** 当前所有木箱的存档快照(落点与 10 格内容) */
  snapshot(): { x: number; y: number; z: number; slots: InventorySlot[] }[] {
    return this.crates.map((crate) => {
      const p = crate.group.position;
      return { x: p.x, y: p.y, z: p.z, slots: crate.storage.snapshot() };
    });
  }

  /** 从存档恢复木箱(含箱内物品) */
  restore(
    list: { x: number; y: number; z: number; slots: InventorySlot[] }[]
  ): void {
    for (const c of list) {
      const crate = new Crate(this.scene, new THREE.Vector3(c.x, c.y, c.z));
      crate.storage.load(c.slots);
      this.crates.push(crate);
    }
  }
}
