import * as THREE from 'three';
import { boyGait } from './BoyGait';
import { ArmReach } from './ArmReach';
import type { ActionType, HandTool } from './Player';
import type { createPlayerModel } from './PlayerModel';

type Model = ReturnType<typeof createPlayerModel>;
const ease = (t: number) => { const p = THREE.MathUtils.clamp(t, 0, 1); return p * p * (3 - 2 * p); };
/** 慢蓄力、快下落、短停顿、柔和回收；首尾均回到准备姿态。 */
function stroke(time: number, period: number): number {
  const p = (time % period) / period;
  if (p < 0.36) return -ease(p / 0.36);
  if (p < 0.53) return -1 + 2 * ease((p - 0.36) / 0.17);
  if (p < 0.61) return 1;
  return 1 - ease((p - 0.61) / 0.39);
}

/** 纯表现层：复用姿态缓冲，不参与位移、碰撞、命中或资源结算。 */
export class PlayerAnimator {
  private readonly nodes: THREE.Object3D[];
  private readonly targets: THREE.Euler[];
  private readonly reachLeft: ArmReach;
  private readonly reachRight: ArmReach;
  private readonly grip = new THREE.Vector3();
  private readonly wrist = new THREE.Vector3();
  private readonly rotation = new THREE.Quaternion();
  private gripWeight = 0;
  private swimPhase = 0;
  private gait = 0;
  private weight = 0;
  private height = 0;

  constructor(private model: Model) {
    this.nodes = [model.upperBody, model.head, ...model.arms, ...model.elbows, ...model.legs, ...model.knees, ...model.ankles];
    this.targets = this.nodes.map(() => new THREE.Euler());
    this.reachLeft = new ArmReach(model.arms[0], model.elbows[0], 1);
    this.reachRight = new ArmReach(model.arms[1], model.elbows[1], -1);
  }

  reset(): void {
    this.swimPhase = 0;
    this.gait = this.weight = this.height = this.gripWeight = 0;
    for (const hand of this.model.hands) hand.scale.setScalar(1);
    this.model.root.position.set(0, 0, 0);
    for (const node of this.nodes) node.rotation.set(0, 0, 0);
  }

  /** 睡眠/死亡由玩家的整体姿态接管时，释放作业残留。 */
  relax(delta: number): void {
    this.gripWeight = 0;
    for (const hand of this.model.hands) hand.scale.setScalar(THREE.MathUtils.lerp(hand.scale.x, 1, 1 - Math.exp(-22 * delta)));
    for (const target of this.targets) target.set(0, 0, 0);
    for (const i of [2, 3, 6, 7]) {
      const rotation = this.nodes[i].rotation;
      this.targets[i].set(rotation.x, -rotation.y, -rotation.z);
    }
    this.height = 0;
    this.apply(delta);
  }

  update(delta: number, elapsed: number, action: ActionType | null, time: number,
    speed: number, swimming: boolean, tool: HandTool): void {
    const [body, head, left, right, elbowL, elbowR, legL, legR, kneeL, kneeR] = this.targets;
    for (const target of this.targets) target.set(0, 0, 0);
    this.weight += (Math.min(speed / 5, 1.5) - this.weight) * (1 - Math.exp(-12 * delta));
    this.gait += Math.min(speed, 9) * delta * 1.6;
    const step = Math.sin(this.gait);
    const breath = Math.sin(elapsed * 2.1);
    this.height = Math.abs(Math.sin(this.gait)) * 0.025 * this.weight;
    body.set(0.035 * this.weight + breath * 0.006, step * 0.035 * this.weight, step * 0.025 * this.weight);
    head.set(-body.x * 0.4, -body.y * 0.5, -body.z * 0.5);
    left.set(step * 0.45 * this.weight, 0, 0.06);
    right.set(-step * 0.45 * this.weight, 0, -0.06);
    elbowL.x = -0.12 - Math.max(0, -step) * 0.24 * this.weight;
    elbowR.x = -0.12 - Math.max(0, step) * 0.24 * this.weight;
    legL.x = -step * 0.58 * this.weight;
    legR.x = step * 0.58 * this.weight;
    kneeL.x = Math.max(0, step) * 0.65 * this.weight;
    kneeR.x = Math.max(0, -step) * 0.65 * this.weight;
    if (this.model.useBoyGait) boyGait(this.targets, this.gait, this.weight);
    if (swimming || action) { this.targets[10].set(0, 0, 0); this.targets[11].set(0, 0, 0); }
    if (tool !== 'hand') { right.x *= 0.45; elbowR.x -= 0.15; }

    let graspLeft = 0;
    let graspRight = 0;
    const fishing = !swimming && tool === 'fishingrod' && (action === 'fish' || action === 'cast');
    const eating = !swimming && (action === 'eat_berry' || action === 'eat_fish');
    const twoHanded = !swimming && (action === 'chop' || action === 'mine')
      && (tool === 'axe' || tool === 'pickaxe' || tool === 'shovel' || tool === 'hoe');
    if (swimming) {
      this.swimPhase += delta * (speed > 0.1 ? 3.6 : 2.2);
      const swim = this.swimPhase;
      this.height = 0;
      body.set(0, Math.sin(swim) * 0.07, 0);
      head.x = -0.2;
      // 手臂在 apply 后由掌心轨迹求解,双手同步从胸前向外划开。
      left.set(-1.2, 0, 0);
      right.set(-1.2, 0, 0);
      elbowL.x = elbowR.x = -0.5;
      legL.x = Math.sin(swim * 2) * 0.3;
      legR.x = -legL.x;
      kneeL.x = 0.2 + Math.max(0, legL.x);
      kneeR.x = 0.2 + Math.max(0, legR.x);
    } else if (action) {
      const s = stroke(time, action === 'mine' ? 0.7 : 0.95);
      switch (action) {
        case 'chop':
        case 'mine': {
          // 身体向右转肩蓄力，前挥时保持同侧持柄的轮廓。
          body.set(0.1 + s * 0.12, 0.48 - s * 0.2, -0.12 + s * 0.04);
          head.set(0.08 - s * 0.04, -body.y * 0.55, -body.z * 0.4);
          right.set(-1.35 + s * 0.85, 0.08, -0.16);
          elbowR.x = -0.55 + s * 0.35;
          left.set(-0.9 + s * 0.45, 0, -0.18);
          elbowL.x = -0.8 + s * 0.25;
          legL.x = -0.08; legR.x = 0.1;
          kneeL.x = 0.1 + Math.max(0, s) * 0.12; kneeR.x = 0.1;
          this.height = -0.02 - Math.max(0, s) * 0.025;
          break;
        }
        case 'pick': {
          // 双手始终伸在身前，错半拍左右拨动，向内扒拢后再张开。
          const phase = time * Math.PI * 2 / 1.05;
          const sweep = Math.sin(phase);
          const scoop = Math.cos(phase);
          graspLeft = (1 + scoop) * 0.5;
          graspRight = (1 - scoop) * 0.5;
          body.set(0.38 + Math.cos(phase * 2) * 0.025, sweep * 0.075, -sweep * 0.025);
          head.set(0.12, -sweep * 0.035, 0);
          this.height = -0.075 - Math.cos(phase * 2) * 0.012;
          legL.x = legR.x = -0.24;
          kneeL.x = kneeR.x = 0.5;
          left.set(-0.95 + scoop * 0.12, 0.22 + sweep * 0.38, 0.16 - scoop * 0.12);
          right.set(-0.95 - scoop * 0.12, -0.22 + sweep * 0.38, -0.16 - scoop * 0.12);
          elbowL.set(-0.45 - graspLeft * 0.25, 0, -sweep * 0.08);
          elbowR.set(-0.45 - graspRight * 0.25, 0, -sweep * 0.08);
          break;
        }
        case 'craft':
          body.x = 0.18 + s * 0.035; head.x = 0.18;
          right.x = -0.75 + s * 0.25; elbowR.x = -0.55 + s * 0.25;
          left.set(-0.7, 0, -0.12); elbowL.x = -0.55;
          break;
        case 'cook': {
          const stir = time * 3.6;
          body.set(0.16, Math.sin(stir) * 0.04, 0); head.x = 0.12;
          right.set(-0.8 + Math.cos(stir) * 0.12, Math.sin(stir) * 0.15, -0.1);
          elbowR.x = -0.55 + Math.cos(stir + 0.5) * 0.18;
          left.x = -0.65; elbowL.x = -0.6;
          break;
        }
        case 'drink':
        case 'eat_berry':
        case 'eat_fish': {
          const lift = ease(time / 0.3);
          const chew = Math.sin(time * 7) * 0.025;
          body.x = action === 'drink' ? -0.04 * lift : 0.04;
          head.x = action === 'drink' ? -0.12 * lift : 0.06 + chew;
          right.set(-0.85 * lift, 0, -0.12); elbowR.x = -1.5 * lift + chew;
          left.x = action === 'eat_berry' ? -0.25 : -0.85 * lift;
          elbowL.x = action === 'eat_berry' ? -0.35 : -1.45 * lift - chew;
          break;
        }
        case 'cast': {
          const cast = ease((time - 0.2) / 0.18);
          body.set(-0.08 + cast * 0.23, -0.12 + cast * 0.2, 0);
          right.x = -2.1 + cast * 1.05; elbowR.x = -0.7 + cast * 0.5;
          left.x = -0.45; elbowL.x = -0.6;
          break;
        }
        case 'fish':
          body.x = 0.06; head.x = 0.06;
          right.x = -1.05 + breath * 0.025; elbowR.x = -0.35;
          left.x = -0.45; elbowL.x = -0.6;
          break;
        case 'shoot': {
          const release = ease(time / 0.16);
          body.y = -0.16 + release * 0.08;
          // 工具实际挂在右手：右臂持弓，左手向面颊收弦后松开。
          right.set(-1.35, 0, -0.08); elbowR.x = -0.15;
          left.set(-0.9, -0.2, -0.32 + release * 0.45);
          elbowL.x = -1.4 + release * 0.35;
          head.y = 0.1;
          if (tool === 'lasso') {
            right.x = -2 + release; elbowR.x = -0.6 + release * 0.4;
            left.set(-0.3, 0, 0.15); elbowL.x = -0.3;
          }
          break;
        }
        case 'slash': {
          const cut = ease((time - 0.045) / 0.12);
          const recover = ease((time - 0.2) / 0.15);
          body.y = (-0.32 + cut * 0.65) * (1 - recover * 0.6);
          body.x = 0.08 * Math.sin(Math.min(time / 0.35, 1) * Math.PI);
          right.set(-1.6 + cut * 0.8 + recover * 0.2, 0.2 - cut * 0.45, -0.55 + cut * 1.05);
          elbowR.x = -0.6 + cut * 0.4 - recover * 0.2;
          left.set(-0.3, 0, 0.25); elbowL.x = -0.5;
          head.y = -body.y * 0.5;
          break;
        }
        case 'sleep': break;
      }
    }
    this.apply(delta);
    if (swimming) {
      // 镜像椭圆:胸前合手 → 前伸 → 向两侧划开 → 收回。
      // y 补偿玩家整体前倾 0.55,让手掌主要沿水面运动。
      const x = 0.29 - Math.cos(this.swimPhase) * 0.20;
      const z = 0.22 + Math.sin(this.swimPhase) * 0.10;
      const y = 0.34 + Math.tan(0.55) * (z - 0.22);
      this.wrist.set(x, y, z);
      this.reachLeft.solve(this.wrist, 1);
      this.wrist.x = -x;
      this.reachRight.solve(this.wrist, 1);
    }
    this.gripWeight += ((twoHanded || fishing ? 1 : 0) - this.gripWeight) * (1 - Math.exp(-28 * delta));
    if (twoHanded || fishing) {
      const swing = stroke(time, action === 'mine' ? 0.7 : 0.95);
      // 右侧持柄；钓鱼时改为身前居中、双手握竿尾。
      if (fishing) {
        const cast = action === 'cast' ? 1 - ease((time - 0.2) / 0.18) : 0;
        this.wrist.set(0, 0.4 + cast * 0.09 + breath * 0.004, 0.14 - cast * 0.025);
      } else {
        this.wrist.set(0.05 - swing * 0.01, 0.41 - swing * 0.075, 0.12 + swing * 0.025);
      }
      this.wrist.x *= -1;
      this.reachRight.solve(this.wrist, this.gripWeight);
      const arm = this.model.arms[1];
      const elbow = this.model.elbows[1];
      this.rotation.copy(arm.quaternion).multiply(elbow.quaternion);
      this.grip.set(-0.006, -0.18 + Math.cos(Math.PI / 2.4) * -0.12,
        0.05 + Math.sin(Math.PI / 2.4) * -0.12).applyQuaternion(this.rotation);
      this.wrist.copy(elbow.position).applyQuaternion(arm.quaternion).add(arm.position);
      this.grip.add(this.wrist);
      this.reachLeft.solve(this.grip, this.gripWeight);
    }
    if (eating) {
      // 从实际嘴部位置推导双掌目标；短手臂尽量靠近嘴边，掌心自然捧合。
      const lift = ease(time / 0.25);
      this.grip.copy(this.model.mouthPosition).applyQuaternion(this.model.head.quaternion).add(this.model.head.position);
      this.grip.y -= 0.055;
      this.grip.z -= 0.025;
      this.wrist.copy(this.grip); this.wrist.x += 0.09;
      this.reachLeft.solve(this.wrist, lift);
      this.wrist.copy(this.grip); this.wrist.x -= 0.09;
      this.reachRight.solve(this.wrist, lift);
      graspLeft = graspRight = lift * 0.65;
    }
    for (let i = 0; i < this.model.hands.length; i++) {
      const hand = this.model.hands[i];
      const closed = twoHanded || fishing ? this.gripWeight : i === 0 ? graspLeft : graspRight;
      const k = 1 - Math.exp(-24 * delta);
      hand.scale.x += (1 + closed * 0.04 - hand.scale.x) * k;
      hand.scale.y += (1 - closed * 0.05 - hand.scale.y) * k;
      hand.scale.z += (1 + closed * 0.03 - hand.scale.z) * k;
    }
  }

  private apply(delta: number): void {
    const k = 1 - Math.exp(-22 * delta);
    for (let i = 0; i < this.nodes.length; i++) {
      const rotation = this.nodes[i].rotation;
      const target = this.targets[i];
      rotation.x += (target.x - rotation.x) * k;
      rotation.y += (-target.y - rotation.y) * k;
      rotation.z += (-target.z - rotation.z) * k;
    }
    this.model.root.position.y += (this.height - this.model.root.position.y) * k;
  }
}
