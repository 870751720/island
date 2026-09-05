import * as THREE from 'three';
import type { Player } from '../entities/Player';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Inventory } from './Inventory';
import type { WaterFx } from '../fx/WaterFx';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { Tools } from './Crafting';
import {
  pickTease,
  rollLoot,
  rollTier,
  rollWait,
  teaseStage,
  TIER_BITE,
  type FishTier,
  type LootEntry,
  type Tease,
  type TeaseStage,
} from './FishTable';

const CAST_TIME = 0.7; // 抛竿(秒,精致鱼竿更快)
const REFINED_CAST_TIME = 0.5;
const REEL_TIME = 0.45; // 中鱼后鱼线收回(纯表现,期间已入包)
/** 精致鱼竿咬钩反应窗口的放大倍数 */
const REFINED_BITE_WINDOW = 1.5;
const RIPPLE_INTERVAL = 2.2; // 等待期间浮漂周围泛涟漪的间隔
/** 海边可下竿的水线水平距离(米) */
const SEA_FISH_RANGE = 1.5;
/** 沿玩家朝向探测浮漂落点的最远距离 */
const CAST_RANGE = 8;
const CAST_MIN_RANGE = 2;
/** 水岸资格与抛竿射线的采样间隔；足够细以避免低模岸线漏判。 */
const WATER_TRACE_STEP = 0.1;

export type FishingState = 'casting' | 'waiting' | 'bite' | 'reeling';

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 浮漂:红白两节的小浮头 */
function makeBobber(): THREE.Group {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 6), clayMaterial('#e74c3c'));
  top.position.y = 0.08;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.12, 6), clayMaterial('#f5f5f5'));
  body.position.y = -0.02;
  g.add(top, body);
  return g;
}

/**
 * 钓鱼:水洼边与海边滩地可下竿。按档位抽取战利品,等待期内按档位出
 * 白/紫/金色预告;咬钩后需在窗口内点击(高档位需连点多次)才能收竿。
 */
export class FishingSystem {
  private state: FishingState | null = null;
  private timer = 0;
  private waitTotal = 0;
  private rippleTimer = 0;
  private tier: FishTier = 1;
  private loot: LootEntry | null = null;
  private tease: Tease | null = null;
  private teaseStageDone: TeaseStage | null = null;
  /** 客人端:本地还在抛竿时房主已进入等待,暂存的房主剩余等待时长(抛竿结束即采用) */
  private pendingWait: number | null = null;
  private clicks = 0;
  private bobber: THREE.Group | null = null;
  private line: THREE.Mesh | null = null;
  private scratch = new THREE.Vector3();
  private scratch2 = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);

  constructor(
    private scene: THREE.Scene,
    private player: Player,
    private terrain: IslandTerrain,
    private inventory: Inventory,
    private waterFx: WaterFx,
    private fx: Particles,
    private audio: GameAudio,
    private tools: Tools,
    /** 中鱼瞬间回调(浮漂落点):通知外层把入包飞行起点定在浮漂处 */
    private onCatch: (position: THREE.Vector3) => void,
    /** 钓鱼杂物概率的降低量(百分点,波塞冬神像放置期间为 1) */
    private junkCut: () => number = () => 0
  ) {}

  private get refined(): boolean {
    return this.tools.fishingrod >= 2;
  }

  private get castTime(): number {
    return this.refined ? REFINED_CAST_TIME : CAST_TIME;
  }

  /** 咬钩反应窗口(精致鱼竿更宽裕) */
  private get biteWindow(): number {
    return TIER_BITE[this.tier].window * (this.refined ? REFINED_BITE_WINDOW : 1);
  }

  /** 当前是否在钓鱼(其他系统让位用) */
  get isWorking(): boolean {
    return this.state !== null;
  }

  get currentState(): FishingState | null {
    return this.state;
  }

  /** 咬钩连点进度(仅 bite 态有意义) */
  get biteClicks(): number {
    return this.clicks;
  }

  get biteNeed(): number {
    return TIER_BITE[this.tier].clicks;
  }

  /** 等待期剩余秒数(供快照下发,客人端以此对齐咬钩时刻),非等待态为 null */
  get waitLeft(): number | null {
    return this.state === 'waiting' ? Math.max(this.waitTotal - this.timer, 0) : null;
  }

  /** 本轮奖池档位(供快照下发,客人端对齐预告与咬钩窗口) */
  get lootTier(): FishTier {
    return this.tier;
  }

  /** 进度 0-1:抛竿/咬钩倒计时,等待/收线/空闲为 null */
  getProgress(): number | null {
    if (this.state === 'casting') return Math.min(this.timer / this.castTime, 1);
    if (this.state === 'bite') {
      return 1 - Math.max(this.timer, 0) / this.biteWindow;
    }
    return null;
  }

  /** 等待期的档位预告(玩家头顶彩字),无则为 null */
  getTease(): Tease | null {
    return this.state === 'waiting' ? this.tease : null;
  }

  /** 站位是否可钓鱼：人在干地，面朝水面，沿朝向 1.5m 内碰到实际水体。 */
  canFishHere(): boolean {
    const p = this.player.group.position;
    if (this.player.isSwimming || this.terrain.getWaterKind(p.x, p.z)) return false;
    return this.traceFacingWater(SEA_FISH_RANGE) !== null && this.facingWaterSamples().length > 0;
  }

  /** 是否满足发起条件(可钓点 + 手持鱼竿 + 站定 + 空闲) */
  canStart(): boolean {
    return (
      this.state === null &&
      this.canFishHere() &&
      !this.player.isMoving &&
      this.player.currentTool === 'fishingrod'
    );
  }

  start(): boolean {
    if (!this.canStart()) return false;
    const target = this.findBobberTarget();
    if (!target) return false;
    this.state = 'casting';
    this.audio.play('whoosh');
    this.timer = 0;
    // 抛竿时消耗 1 个鱼饵(有则用,无则裸钓:高档概率大幅降低)
    const baited = this.inventory.count('bait') > 0;
    if (baited) this.inventory.remove('bait', 1);
    this.tier = rollTier(baited, this.junkCut());
    this.loot = rollLoot(this.tier);
    this.tease = null;
    this.teaseStageDone = null;
    this.pendingWait = null;
    this.clicks = 0;
    this.bobber = makeBobber();
    this.bobber.visible = false;
    this.scene.add(this.bobber);
    // 钓线:细圆柱,每帧从竿梢拉到浮漂
    this.line = new THREE.Mesh(
      new THREE.CylinderGeometry(0.027, 0.027, 1, 4),
      new THREE.MeshBasicMaterial({ color: '#f5f2e8' })
    );
    this.scene.add(this.line);
    this.bobberTarget = target;
    return true;
  }

  private bobberTarget = new THREE.Vector3();

  /** 咬钩窗口内点击屏幕任意处调用,累计点击;达到次数立刻结算入包并转入收线表现 */
  hook(): boolean {
    if (this.state !== 'bite') return false;
    this.clicks++;
    if (this.clicks < TIER_BITE[this.tier].clicks) return false;
    this.state = 'reeling';
    this.timer = 0;
    this.audio.play('splash');
    this.waterFx.splash(this.bobberTarget);
    // 中鱼即入包:入包飞行(浮漂点起飞)由外层 onAdd 驱动,这里只交代起点
    this.onCatch(this.bobberTarget);
    const added = this.inventory.add(this.loot!.kind, 1);
    if (added === 0) {
      // 背包已满:鱼获落空,浮漂处散一撮灰渣
      this.audio.play('drop');
      this.fx.burst(this.bobberTarget, '#b5b0a8', 8);
    }
    return true;
  }

  /** 移动或其他占用双手的行为会中断钓鱼 */
  update(delta: number, busy: boolean): void {
    if (!this.state) return;
    if (this.player.isMoving || this.player.isSwimming || this.player.currentTool !== 'fishingrod' || busy) {
      this.stop();
      return;
    }
    this.player.setAction(this.state === 'casting' ? 'cast' : 'fish');
    this.timer += delta;
    this.updateLine();

    switch (this.state) {
      case 'casting': {
        const t = Math.min(this.timer / CAST_TIME, 1);
        // 浮漂从玩家手边抛物线飞向落点
        const from = this.player.group.position.clone();
        from.y += 0.9;
        this.bobber!.visible = true;
        this.bobber!.position.lerpVectors(from, this.bobberTarget, t);
        this.bobber!.position.y += Math.sin(t * Math.PI) * 1.2;
        if (this.timer >= this.castTime) {
          this.state = 'waiting';
          this.audio.play('splash');
          // 客人端若已收到房主的剩余等待时长则直接采用,否则(房主端)本地随机
          this.waitTotal = this.pendingWait ?? rollWait(this.tier);
          this.pendingWait = null;
          this.timer = 0;
          this.rippleTimer = 0;
          this.bobber!.position.copy(this.bobberTarget);
          this.waterFx.ripple(this.bobberTarget.x, this.bobberTarget.y, this.bobberTarget.z);
        }
        break;
      }
      case 'waiting': {
        // 浮漂随水轻晃,周围偶尔泛涟漪
        this.bobber!.position.y =
          this.bobberTarget.y + Math.sin(this.timer * 2) * 0.03;
        this.rippleTimer += delta;
        if (this.rippleTimer >= RIPPLE_INTERVAL) {
          this.rippleTimer = 0;
          this.waterFx.ripple(this.bobberTarget.x, this.bobberTarget.y, this.bobberTarget.z);
        }
        // 档位预告:阶段切换时抽一句并缓存
        const stage = teaseStage(this.tier, this.waitTotal - this.timer);
        if (stage && stage !== this.teaseStageDone) {
          this.teaseStageDone = stage;
          this.tease = pickTease(stage);
        }
        if (stage === null) this.tease = null;
        if (this.timer >= this.waitTotal) {
          this.state = 'bite';
          this.tease = null;
          this.audio.play('bite');
          this.timer = 0;
          this.clicks = 0;
          // 咬钩:浮漂猛地下沉,水花四溅
          this.bobber!.position.y = this.bobberTarget.y - 0.15;
          this.waterFx.splash(this.bobberTarget);
        }
        break;
      }
      case 'bite': {
        this.bobber!.position.y =
          this.bobberTarget.y - 0.15 + Math.sin(this.timer * 25) * 0.05;
        if (this.timer >= this.biteWindow) {
          // 超时鱼跑:涟漪散开,收竿结束
          this.waterFx.ripple(this.bobberTarget.x, this.bobberTarget.y, this.bobberTarget.z);
          this.stop();
        }
        break;
      }
      case 'reeling': {
        // 收线表现:浮漂被拽离落点快速拉回竿梢,鱼获已入包、飞行另由入包管线表现
        const t = Math.min(this.timer / REEL_TIME, 1);
        const tip = this.player.getRodTip(this.scratch)
          ? this.scratch
          : this.scratch.copy(this.player.group.position).setY(this.player.group.position.y + 0.9);
        this.bobber!.position.lerpVectors(this.bobberTarget, tip, t);
        this.bobber!.position.y += Math.sin(t * Math.PI) * 0.8;
        this.bobber!.rotation.z = t * Math.PI * 3;
        if (t >= 1) {
          this.state = null;
          this.tease = null;
          this.removeBobber();
          this.removeLine();
          this.clearFishingAction();
        }
        break;
      }
    }
  }

  /** 中断钓鱼,清掉场上物件(收竿不给鱼) */
  private stop(): void {
    this.state = null;
    this.tease = null;
    this.removeBobber();
    this.removeLine();
    this.clearFishingAction();
  }

  /** 客人端表现驱动:进入钓鱼时本地起播浮漂与钓线,阶段与中断由房主快照纠正 */
  netEnter(): void {
    if (this.state !== null) return;
    const target = this.findBobberTarget();
    if (!target) return;
    this.state = 'casting';
    this.audio.play('whoosh');
    this.timer = 0;
    this.tease = null;
    this.teaseStageDone = null;
    this.pendingWait = null;
    this.clicks = 0;
    this.bobber = makeBobber();
    this.bobber.visible = false;
    this.scene.add(this.bobber);
    this.line = new THREE.Mesh(
      new THREE.CylinderGeometry(0.027, 0.027, 1, 4),
      new THREE.MeshBasicMaterial({ color: '#f5f2e8' })
    );
    this.scene.add(this.line);
    this.bobberTarget = target;
  }

  /** 客人端:房主快照宣告钓鱼结束(收竿/中断)时清掉本地表现 */
  netStop(): void {
    this.stop();
  }

  /** 客人端:按房主快照对齐钓鱼阶段与等待时长(咬钩时刻以房主剩余时间为锚,阶段纠正仅作兜底) */
  netSyncState(state: FishingState | null, clicks = 0, tier: FishTier = 1, waitLeft: number | null = null): void {
    if (state === null) {
      this.stop();
      return;
    }
    if (state === 'waiting') {
      // 档位跟随房主(预告文字与咬钩窗口都依赖它);等待剩余时间以房主为锚重设总额
      this.tier = tier;
      if (waitLeft !== null) {
        if (this.state === 'waiting') this.waitTotal = this.timer + waitLeft;
        else if (this.state === 'casting') this.pendingWait = waitLeft;
      }
      return;
    }
    // 房主仍在钓鱼而本地表现已断(中断误伤/窗口时长出入导致本地先超时):重新起播再对齐
    if (this.state === null) this.netEnter();
    if (state === 'bite') {
      this.tier = tier;
      if (this.state === 'bite') {
        this.clicks = clicks;
      } else if (this.state !== 'reeling') {
        this.state = 'bite';
        this.timer = 0;
        this.clicks = clicks;
        this.tease = null;
        this.audio.play('bite');
        this.bobber!.position.y = this.bobberTarget.y - 0.15;
        this.waterFx.splash(this.bobberTarget);
      }
      return;
    }
    if (state === 'reeling' && this.state !== 'reeling') {
      // 房主已结算中鱼:本地转入收线表现,入包飞行起点交代在浮漂处(入包由 HUD 快照回流驱动)
      this.state = 'reeling';
      this.timer = 0;
      this.audio.play('splash');
      this.waterFx.splash(this.bobberTarget);
      this.onCatch(this.bobberTarget);
    }
  }

  private removeBobber(): void {
    if (!this.bobber) return;
    this.scene.remove(this.bobber);
    this.bobber = null;
  }

  private removeLine(): void {
    if (!this.line) return;
    this.scene.remove(this.line);
    this.line.geometry.dispose();
    this.line = null;
  }

  /** 钓线从竿梢拉到浮漂(抛竿飞行中也跟随,视觉上是甩出去的线) */
  private updateLine(): void {
    if (!this.line || !this.bobber || !this.bobber.visible) return;
    if (!this.player.getRodTip(this.scratch2)) return;
    const end = this.bobber.position;
    const dir = this.scratch.copy(end).sub(this.scratch2);
    const len = dir.length();
    if (len < 0.01) return;
    this.line.position.copy(this.scratch2).addScaledVector(dir, 0.5);
    this.line.scale.set(1, len, 1);
    this.line.quaternion.setFromUnitVectors(this.up, dir.normalize());
  }

  /** 浮漂严格沿玩家朝向，在 2~8m 内随机选一个实际水面；资格检测保证 1.5m 内先碰到水。 */
  private findBobberTarget(): THREE.Vector3 | null {
    if (!this.traceFacingWater(SEA_FISH_RANGE)) return null;
    const samples = this.facingWaterSamples();
    return samples.length > 0 ? samples[Math.floor(Math.random() * samples.length)] : null;
  }

  /** 沿角色正前方找实际水面。farthest=true 返回范围内最远水点，否则返回首个水点。 */
  private traceFacingWater(range: number, farthest = false): THREE.Vector3 | null {
    const p = this.player.group.position;
    const rot = this.player.group.rotation.y;
    const dx = Math.sin(rot);
    const dz = Math.cos(rot);
    let result: THREE.Vector3 | null = null;
    for (let distance = WATER_TRACE_STEP; distance <= range + 0.001; distance += WATER_TRACE_STEP) {
      const x = p.x + dx * distance;
      const z = p.z + dz * distance;
      if (!this.terrain.getWaterKind(x, z)) continue;
      result = new THREE.Vector3(x, this.terrain.getWaterLevel(x, z), z);
      if (!farthest) return result;
    }
    return result;
  }

  /** 玩家正前方 2~8m 内的全部实际水面采样，随机取样即可得到随机远近且保证落水。 */
  private facingWaterSamples(): THREE.Vector3[] {
    const p = this.player.group.position;
    const rot = this.player.group.rotation.y;
    const dx = Math.sin(rot);
    const dz = Math.cos(rot);
    const samples: THREE.Vector3[] = [];
    for (let distance = CAST_MIN_RANGE; distance <= CAST_RANGE + 0.001; distance += WATER_TRACE_STEP) {
      const x = p.x + dx * distance;
      const z = p.z + dz * distance;
      if (this.terrain.getWaterKind(x, z)) {
        samples.push(new THREE.Vector3(x, this.terrain.getWaterLevel(x, z), z));
      }
    }
    return samples;
  }

  /** 只清理由本系统设置的动作，避免覆盖同帧接管的其他交互。 */
  private clearFishingAction(): void {
    if (this.player.currentAction === 'cast' || this.player.currentAction === 'fish') {
      this.player.setAction(null);
    }
  }
}
