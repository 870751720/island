import * as THREE from 'three';
import type { Player } from '../entities/Player';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Inventory } from './Inventory';
import type { WaterFx } from '../fx/WaterFx';
import type { Particles } from '../fx/Particles';

const CAST_TIME = 0.7; // 抛竿(秒)
const WAIT_MIN = 4; // 等鱼上钩最短等待
const WAIT_MAX = 9; // 等鱼上钩最长等待
const BITE_WINDOW = 1.3; // 咬钩后可提起的反应窗口(秒)
const CATCH_TIME = 0.9; // 收竿把鱼拉回(秒)
const RIPPLE_INTERVAL = 2.2; // 等待期间浮漂周围泛涟漪的间隔
/** 海边判定:站在海平面以上不高的滩地上即可下竿 */
const BEACH_BAND = 0.55;
/** 从脚下向水面方向探测浮漂落点的最远距离 */
const CAST_RANGE = 4.2;
/** 水洼落点:洼中心 0.5 米半径内随机 */
const POND_SPREAD = 0.5;
/** 海边落点:玩家向海方向 3~4 米外随机 */
const SEA_CAST_MIN = 3;
const SEA_CAST_MAX = 4;

export type FishingState = 'casting' | 'waiting' | 'bite' | 'catching';

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

/** 提竿拉回的鱼:拉长的低面数鱼身 */
function makeFish(): THREE.Mesh {
  const fish = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), clayMaterial('#5fa8d3'));
  fish.scale.set(1.6, 0.7, 0.6);
  return fish;
}

/**
 * 钓鱼:水洼边与海边滩地可下竿。抛竿后浮漂落水,随机等待;
 * 咬钩时浮漂猛地下沉并在限时内点击屏幕任意处即可收竿得鱼,超时鱼跑。
 */
export class FishingSystem {
  private state: FishingState | null = null;
  private timer = 0;
  private waitTotal = 0;
  private rippleTimer = 0;
  private bobber: THREE.Group | null = null;
  private line: THREE.Mesh | null = null;
  private fish: THREE.Mesh | null = null;
  private scratch = new THREE.Vector3();
  private scratch2 = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);

  constructor(
    private scene: THREE.Scene,
    private player: Player,
    private terrain: IslandTerrain,
    private inventory: Inventory,
    private waterFx: WaterFx,
    private fx: Particles
  ) {}

  /** 当前是否在钓鱼(其他系统让位用) */
  get isWorking(): boolean {
    return this.state !== null;
  }

  get currentState(): FishingState | null {
    return this.state;
  }

  /** 进度 0-1:抛竿/咬钩倒计时/收竿,等待与空闲为 null */
  getProgress(): number | null {
    if (this.state === 'casting') return Math.min(this.timer / CAST_TIME, 1);
    if (this.state === 'bite') return 1 - Math.max(this.timer, 0) / BITE_WINDOW;
    if (this.state === 'catching') return Math.min(this.timer / CATCH_TIME, 1);
    return null;
  }

  /** 站位是否可钓鱼:不在水里/不游泳,且在水洼边或海边滩地 */
  canFishHere(): boolean {
    const p = this.player.group.position;
    if (this.player.isSwimming || this.terrain.isInWater(p)) return false;
    if (this.terrain.getHeight(p.x, p.z) <= this.terrain.getWaterLevel(p.x, p.z)) return false;
    const nearPond = this.terrain.isNearWater(p, 1.2);
    const onBeach = this.terrain.getHeight(p.x, p.z) - this.terrain.seaLevel < BEACH_BAND;
    return nearPond || onBeach;
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
    this.timer = 0;
    this.bobber = makeBobber();
    this.bobber.visible = false;
    this.scene.add(this.bobber);
    // 钓线:细圆柱,每帧从竿梢拉到浮漂
    this.line = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1, 4),
      new THREE.MeshBasicMaterial({ color: '#f5f2e8' })
    );
    this.scene.add(this.line);
    this.bobberTarget = target;
    return true;
  }

  private bobberTarget = new THREE.Vector3();

  /** 咬钩窗口内点击屏幕任意处调用,收竿得鱼;其余时刻无效 */
  hook(): boolean {
    if (this.state !== 'bite') return false;
    this.state = 'catching';
    this.timer = 0;
    this.waterFx.splash(this.bobberTarget);
    this.fish = makeFish();
    this.fish.position.copy(this.bobberTarget);
    this.scene.add(this.fish);
    this.removeBobber();
    this.removeLine();
    return true;
  }

  /** 移动或其他占用双手的行为会中断钓鱼 */
  update(delta: number, busy: boolean): void {
    if (!this.state) return;
    if (this.player.isMoving || this.player.isSwimming || busy) {
      this.stop();
      return;
    }
    this.player.setAction(this.state === 'casting' ? 'cast' : 'fish');
    this.timer += delta;
    if (this.state !== 'catching') this.updateLine();

    switch (this.state) {
      case 'casting': {
        const t = Math.min(this.timer / CAST_TIME, 1);
        // 浮漂从玩家手边抛物线飞向落点
        const from = this.player.group.position.clone();
        from.y += 0.9;
        this.bobber!.visible = true;
        this.bobber!.position.lerpVectors(from, this.bobberTarget, t);
        this.bobber!.position.y += Math.sin(t * Math.PI) * 1.2;
        if (this.timer >= CAST_TIME) {
          this.state = 'waiting';
          this.waitTotal = WAIT_MIN + Math.random() * (WAIT_MAX - WAIT_MIN);
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
        if (this.timer >= this.waitTotal) {
          this.state = 'bite';
          this.timer = 0;
          // 咬钩:浮漂猛地下沉,水花四溅
          this.bobber!.position.y = this.bobberTarget.y - 0.15;
          this.waterFx.splash(this.bobberTarget);
        }
        break;
      }
      case 'bite': {
        this.bobber!.position.y =
          this.bobberTarget.y - 0.15 + Math.sin(this.timer * 25) * 0.05;
        if (this.timer >= BITE_WINDOW) {
          // 超时鱼跑:涟漪散开,收竿结束
          this.waterFx.ripple(this.bobberTarget.x, this.bobberTarget.y, this.bobberTarget.z);
          this.stop();
        }
        break;
      }
      case 'catching': {
        // 鱼被拉出水面,抛物线飞向玩家
        const t = Math.min(this.timer / CATCH_TIME, 1);
        const to = this.player.group.position.clone();
        to.y += 1.1;
        this.fish!.position.lerpVectors(this.bobberTarget, to, t);
        this.fish!.position.y += Math.sin(t * Math.PI) * 1.4;
        this.fish!.rotation.z = t * Math.PI * 4;
        if (this.timer >= CATCH_TIME) {
          const added = this.inventory.add('fish', 1);
          const p = to.clone();
          this.scene.remove(this.fish!);
          this.fish = null;
          this.state = null;
          this.removeLine();
          if (added > 0) {
            this.fx.burst(p, '#5fa8d3', 10);
          } else {
            this.fx.burst(p, '#b5b0a8', 8);
          }
        }
        break;
      }
    }
  }

  /** 中断钓鱼,清掉场上物件(收竿不给鱼) */
  private stop(): void {
    this.state = null;
    this.removeBobber();
    this.removeLine();
    if (this.fish) {
      this.scene.remove(this.fish);
      this.fish = null;
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

  /** 浮漂落点:水洼取洼中心 0.5 米内随机,海边向海方向 3~4 米外随机 */
  private findBobberTarget(): THREE.Vector3 | null {
    const p = this.player.group.position;
    const nearest = this.terrain.waterAreas.reduce<(typeof this.terrain.waterAreas)[number] | null>(
      (best, w) => {
        const d = Math.hypot(p.x - w.x, p.z - w.z);
        return !best || d < Math.hypot(p.x - best.x, p.z - best.z) ? w : best;
      },
      null
    );

    // 水洼:落点散布在洼中心附近,保证在水中央
    if (nearest && Math.hypot(p.x - nearest.x, p.z - nearest.z) < nearest.radius + 3) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * POND_SPREAD;
      const x = nearest.x + Math.cos(a) * r;
      const z = nearest.z + Math.sin(a) * r;
      return new THREE.Vector3(x, this.terrain.getWaterLevel(x, z), z);
    }

    // 海边:朝岛外方向抛 3~4 米,落不进水则逐段探测兜底
    const dir = this.scratch.set(p.x, 0, p.z);
    if (dir.lengthSq() < 0.001) dir.set(1, 0, 0);
    dir.normalize();
    const d = SEA_CAST_MIN + Math.random() * (SEA_CAST_MAX - SEA_CAST_MIN);
    const x = p.x + dir.x * d;
    const z = p.z + dir.z * d;
    if (this.terrain.getHeight(x, z) < this.terrain.getWaterLevel(x, z)) {
      return new THREE.Vector3(x, this.terrain.getWaterLevel(x, z), z);
    }
    for (let t = 1; t <= CAST_RANGE; t += 0.2) {
      const fx = p.x + dir.x * t;
      const fz = p.z + dir.z * t;
      if (this.terrain.getHeight(fx, fz) < this.terrain.getWaterLevel(fx, fz)) {
        return new THREE.Vector3(fx, this.terrain.getWaterLevel(fx, fz), fz);
      }
    }
    return null;
  }
}
