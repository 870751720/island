import * as THREE from 'three';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { PlayerSession } from '../mp/PlayerSession';
import type { ResourceKind } from './Inventory';
import { ActionHold } from './ActionHold';
import { WorldEntityIds, type EntityChangeSink } from './WorldEntityId';
import { CROP_OF_SEED, CROP_SPECS, Crop, type CropKind, type CropSave } from '../entities/Crop';

const HARVEST_RANGE = 1.6; // 空手可采收成熟作物的距离
const HARVEST_TIME = 0.6; // 一次采收动作时长(秒)
const SWAY_AMOUNT = 0.05; // 随风轻摆的幅度(弧度)
const SPARKLE_INTERVAL = 2.2; // 成熟作物粒子的间隔(秒)
/** 快照对账容差:客人本地累计的生长秒数与房主差距在该值内时保留本地值(柔和对账) */
const AGE_SYNC_TOLERANCE = 5;

/** 每玩家的采收进度(作物是世界共享的) */
type PlayerSessionState = { hold: ActionHold; swingTimer: number; harvestTarget: Crop | null };

/**
 * 作物系统(世界共享,按发起者 actor 结算):种子只能种在没种作物的土壤格上;
 * 生长分幼苗/未成熟/成熟三阶段,各阶段时长按作物种类配置(只在游戏内累计,离线不快进);
 * 成熟后空手靠近站定即可采收,产出直接进发起者背包(与采集浆果丛一致);模型随风轻摆,成熟时有粒子表现。
 */
export class CropSystem {
  private crops: Crop[] = [];
  private states = new Map<PlayerSession, PlayerSessionState>();
  private ids = new WorldEntityIds<Crop>('crop');
  private onChanged?: EntityChangeSink;
  private sparkleTimer = 0;

  setChangeSink(sink?: EntityChangeSink): void {
    this.onChanged = sink;
  }

  constructor(
    private scene: THREE.Scene,
    private fx: Particles,
    private audio: GameAudio,
    /** 该格中心是否有土壤(播种校验用) */
    private soilAt: (x: number, z: number) => boolean,
    /** 其他占用双手的行为(如采集中),为真时采收让位 */
    private isOtherBusy: (actor: PlayerSession) => boolean = () => false,
    /** 采收粒子同步给联机客人 */
    private onFx: (position: THREE.Vector3, color: string, count: number) => void = () => {}
  ) {}

  private st(actor: PlayerSession): PlayerSessionState {
    let st = this.states.get(actor);
    if (!st) {
      st = { hold: new ActionHold(), swingTimer: 0, harvestTarget: null };
      this.states.set(actor, st);
    }
    return st;
  }

  /** 移除会话时清理其个人进度 */
  detach(actor: PlayerSession): void {
    this.states.delete(actor);
  }

  /** 播种落点校验:该格必须有土壤且没种过作物,返回 null=可种 */
  canPlantAt(actor: PlayerSession, x: number, z: number): string | null {
    if (actor.player.isSwimming) return '游泳时不能播种';
    if (!this.soilAt(x, z)) return '种子要种在土壤上,先用锄头开垦';
    return this.cropAt(x, z) ? '这块土壤已经种了作物' : null;
  }

  /** 该格中心(水平距离 0.6 内)的作物,没有则 null */
  cropAt(x: number, z: number): Crop | null {
    for (const crop of this.crops) {
      const p = crop.group.position;
      if (Math.hypot(p.x - x, p.z - z) < 0.6) return crop;
    }
    return null;
  }

  /** 铲子优先铲作物:铲掉该位置的作物(无掉落),返回是否真的铲掉了 */
  removeAt(x: number, z: number): boolean {
    const crop = this.cropAt(x, z);
    if (!crop) return false;
    this.destroy(crop);
    return true;
  }

  /** 播种(统一设施结算的 place 委托,落格已校验):扣种子并生成幼苗 */
  plant(actor: PlayerSession, seed: ResourceKind, at: THREE.Vector3): boolean {
    if (this.canPlantAt(actor, at.x, at.z) !== null) return false;
    if (!actor.inventory.remove(seed, 1)) return false;
    this.spawn(CROP_OF_SEED[seed]!, at, 0);
    this.audio.play('success');
    const fxPos = at.clone();
    fxPos.y += 0.3;
    this.fx.burst(fxPos, '#7fae55', 8);
    return true;
  }

  private spawn(kind: CropKind, at: THREE.Vector3, grown: number): Crop {
    const crop = new Crop(this.scene, CROP_SPECS[kind], at.clone(), grown);
    this.crops.push(crop);
    const p = crop.group.position;
    this.onChanged?.({
      op: 'add',
      id: this.ids.get(crop),
      value: { id: this.ids.get(crop), kind, x: p.x, y: p.y, z: p.z, grown },
    });
    return crop;
  }

  private destroy(crop: Crop): void {
    this.onChanged?.({ op: 'remove', id: this.ids.get(crop) });
    this.scene.remove(crop.group);
    this.crops.splice(this.crops.indexOf(crop), 1);
  }

  /** 每帧推进该玩家的空手采收:靠近成熟作物站定即自动采收;帧末统一提交持有的动作 */
  updateActor(actor: PlayerSession, delta: number): void {
    const st = this.st(actor);
    try {
      const p = actor.player.group.position;
      let target: Crop | null = null;
      if (
        actor.player.currentTool === 'hand' &&
        !actor.player.isSwimming &&
        !actor.player.isMoving &&
        !this.isOtherBusy(actor)
      ) {
        for (const crop of this.crops) {
          if (!crop.mature) continue;
          if (crop.group.position.distanceTo(p) < HARVEST_RANGE) {
            target = crop;
            break;
          }
        }
      }
      if (!target) {
        st.harvestTarget = null;
        st.swingTimer = 0;
        return;
      }
      st.harvestTarget = target;
      st.hold.hold(actor.player, 'pick');
      st.swingTimer += delta;
      if (st.swingTimer < HARVEST_TIME) return;
      st.swingTimer = 0;
      this.harvest(actor, target);
      st.harvestTarget = null;
    } finally {
      st.hold.commit(actor.player);
    }
  }

  /** 采收一株成熟作物:作物消失,产出直接进发起者背包(联机时经房主权威结算,背包随快照回流) */
  private harvest(actor: PlayerSession, crop: Crop): void {
    const spec = crop.spec;
    const p = crop.group.position;
    this.destroy(crop);
    actor.inventory.add(spec.product, spec.yieldCount);
    // 采收必掉 1 个对应种子,10% 概率额外多掉 1 个(随机只在权威结算端发生,背包随快照回流)
    actor.inventory.add(spec.seed, Math.random() < 0.1 ? 2 : 1);
    this.audio.play('pick');
    const fxPos = p.clone();
    fxPos.y += 0.3;
    this.fx.burst(fxPos, spec.fxColor, 12);
    this.onFx(fxPos, spec.fxColor, 12);
  }

  /** 正在采收作物 */
  isHarvesting(actor: PlayerSession): boolean {
    return !!this.states.get(actor)?.harvestTarget;
  }

  /** 当前采收进度 0-1,未在采收时为 null */
  getHarvestProgress(actor: PlayerSession): number | null {
    const st = this.states.get(actor);
    if (!st?.harvestTarget) return null;
    return Math.min(st.swingTimer / HARVEST_TIME, 1);
  }

  /** 全场作物推进:生长计时(两端各自累计,快照柔和对账)、随风轻摆与成熟粒子 */
  update(delta: number, elapsed: number): void {
    for (const crop of this.crops) {
      crop.grow(delta);
      crop.group.rotation.z = Math.sin(elapsed * 1.4 + crop.swayPhase) * SWAY_AMOUNT;
      crop.group.rotation.x = Math.cos(elapsed * 1.1 + crop.swayPhase) * SWAY_AMOUNT * 0.6;
    }
    this.sparkleTimer += delta;
    if (this.sparkleTimer < SPARKLE_INTERVAL) return;
    this.sparkleTimer = 0;
    // 成熟作物的收获提示粒子:纯表现,两端各自本地播放
    for (const crop of this.crops) {
      if (!crop.mature) continue;
      const p = crop.group.position.clone();
      p.y += 0.35;
      this.fx.burst(p, '#ffe58a', 2);
    }
  }

  /** 当前所有作物的存档快照 */
  snapshot(): CropSave[] {
    return this.crops.map((crop) => {
      const p = crop.group.position;
      return { id: this.ids.get(crop), kind: crop.spec.kind, x: p.x, y: p.y, z: p.z, grown: crop.grown };
    });
  }

  /** 清空场上全部作物(客人侧重放世界快照前调用) */
  clear(): void {
    for (const crop of this.crops) this.scene.remove(crop.group);
    this.crops = [];
  }

  /** 从存档恢复全部作物 */
  restore(list: CropSave[]): void {
    for (const c of list) {
      const crop = this.spawn(c.kind, new THREE.Vector3(c.x, c.y, c.z), c.grown ?? 0);
      this.ids.set(crop, c.id);
    }
  }

  /** 客人端对账世界增量:新增/移除按 id 复现,生长秒数差距小时保留本地累计(柔和对账) */
  netApply(list: CropSave[]): void {
    const incoming = new Map(list.filter((x) => x.id).map((x) => [x.id!, x]));
    for (let i = this.crops.length - 1; i >= 0; i--) {
      const crop = this.crops[i];
      const match = incoming.get(this.ids.get(crop));
      if (!match) {
        this.scene.remove(crop.group);
        this.crops.splice(i, 1);
        continue;
      }
      if (Math.abs(match.grown - crop.grown) > AGE_SYNC_TOLERANCE) crop.grow(match.grown - crop.grown);
    }
    const current = new Map(this.crops.map((crop) => [this.ids.get(crop), crop]));
    for (const value of list) {
      if (value.id && current.has(value.id)) continue;
      this.spawn(value.kind, new THREE.Vector3(value.x, value.y, value.z), value.grown ?? 0);
      if (value.id) this.ids.set(this.crops[this.crops.length - 1], value.id);
    }
  }
}
