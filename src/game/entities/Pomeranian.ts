import * as THREE from 'three';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Player } from './Player';
import type { DropSystem } from '../systems/DropSystem';

/** 闻到肉块的半径:在这个距离内的地面肉块会把狗狗吸引过去 */
const SMELL_RANGE = 9;
/** 吃到肉块的距离:走到这么近就开吃 */
const EAT_RANGE = 0.7;
/** 玩家远于该距离时狗狗跟上来,近于该距离时停下自己玩 */
const FOLLOW_RANGE = 3.2;
/** 平时小跑与追肉/追人时的奔跑速度 */
const TROT_SPEED = 2.4;
const RUN_SPEED = 4.6;
/** 只在干地上活动:低于该地形高度视为水面/湿沙,不踏入 */
const LAND_MIN = 0.03;

/** 表情气泡持续秒数 */
const EMOJI_TIME = 2.6;
/** 闲玩状态下随机发表情的间隔(秒) */
const PLAY_EMOJI_INTERVAL = 7;

/** 吃完一块肉的进食动作时长(低头咀嚼) */
const EAT_DURATION = 1.4;
/** 吃饱后的开心转圈时长 */
const HAPPY_DURATION = 2.2;

/** 闲玩行为:围着玩家转圈 / 原地转圈 / 原地趴坐 */
type Play = 'circle' | 'spin' | 'sit';

type DogModel = {
  group: THREE.Group;
  legs: THREE.Mesh[];
  head: THREE.Object3D;
  tail: THREE.Object3D;
  body: THREE.Object3D;
};

function clay(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 一条短腿:锥形杆从髋部垂下,根部落在一端以便摆动 */
function makeLeg(mat: THREE.Material, x: number, y: number, z: number, len: number): THREE.Mesh {
  const leg = new THREE.Mesh(
    new THREE.CylinderGeometry(len * 0.24, len * 0.32, len, 4),
    mat
  );
  leg.geometry.translate(0, -len / 2, 0);
  leg.position.set(x, y, z);
  leg.castShadow = true;
  return leg;
}

/** 低多边形黑色博美:蓬松黑毛圆身 + 张开的鬃毛、尖耳、平贴短尾与粉舌头 */
function makePomeranianModel(): DogModel {
  const group = new THREE.Group();
  const fur = clay('#26262e');
  const mane = clay('#33333d');
  const dark = clay('#101014');

  // 躯干:圆润的毛球,腿短身低,几乎贴地一团黑毛
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 6), fur);
  body.scale.set(0.95, 1, 1.3);
  body.position.y = 0.21;
  body.castShadow = true;
  group.add(body);

  // 头颈:鬃毛大盘 + 略小的头,博美标志性的「狮子脸」
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.39, 0.18);
  const ruff = new THREE.Mesh(new THREE.SphereGeometry(0.17, 7, 6), mane);
  ruff.scale.set(1.1, 0.95, 1);
  ruff.castShadow = true;
  headPivot.add(ruff);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 6), fur);
  head.position.set(0, 0.02, 0.08);
  head.castShadow = true;
  headPivot.add(head);
  // 尖耳朵:小锥体立在头顶两侧
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 4), fur);
    ear.position.set(side * 0.08, 0.16, 0.02);
    ear.rotation.z = -side * 0.25;
    headPivot.add(ear);
  }
  // 黑鼻头 + 粉舌头 + 两个白色像素点眼睛
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.028, 5, 4), dark);
  nose.position.set(0, -0.02, 0.21);
  headPivot.add(nose);
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, 0.07), clay('#e58a95'));
  tongue.position.set(0, -0.06, 0.19);
  headPivot.add(tongue);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 3), clay('#f5f5f5'));
    eye.position.set(side * 0.06, 0.04, 0.18);
    headPivot.add(eye);
  }
  group.add(headPivot);

  // 四条小短腿:短到几乎藏进毛里
  const legs = [
    makeLeg(fur, -0.09, 0.17, 0.14, 0.14),
    makeLeg(fur, 0.09, 0.17, 0.14, 0.14),
    makeLeg(fur, -0.09, 0.18, -0.14, 0.15),
    makeLeg(fur, 0.09, 0.18, -0.14, 0.15),
  ];
  legs.forEach((l) => group.add(l));

  // 尾巴:不翘起,一短串毛球平贴在身后,略微下垂
  const tail = new THREE.Group();
  tail.position.set(0, 0.22, -0.22);
  for (let i = 0; i < 3; i++) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.055 - i * 0.012, 5, 4), i === 0 ? fur : mane);
    ball.position.set(0, -i * 0.015, -i * 0.07);
    ball.castShadow = true;
    tail.add(ball);
  }
  group.add(tail);

  return { group, legs, head: headPivot, tail, body };
}

/** 头顶表情气泡:白色圆角气泡 + emoji 的 Canvas 贴图 Sprite,始终盖在场景之上 */
class EmojiBubble {
  readonly sprite: THREE.Sprite;
  private canvas = document.createElement('canvas');
  private texture: THREE.CanvasTexture;
  private left = 0;

  constructor() {
    this.canvas.width = 160;
    this.canvas.height = 160;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.texture, transparent: true, depthTest: false })
    );
    this.sprite.renderOrder = 999;
    this.sprite.scale.setScalar(1);
    this.sprite.position.set(0, 1.25, 0);
    this.sprite.visible = false;
  }

  show(emoji: string): void {
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 160, 160);
    // 白色圆角气泡衬底,深色描边保证任何背景下都看得清
    ctx.beginPath();
    ctx.arc(80, 80, 62, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(60,60,70,0.9)';
    ctx.stroke();
    ctx.font = '84px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#333';
    ctx.fillText(emoji, 80, 88);
    this.texture.needsUpdate = true;
    this.sprite.visible = true;
    this.sprite.material.opacity = 1;
    this.left = EMOJI_TIME;
  }

  update(delta: number, elapsed: number): void {
    if (!this.sprite.visible) return;
    this.left -= delta;
    if (this.left <= 0) {
      this.sprite.visible = false;
      return;
    }
    // 淡出前轻微上飘 + 呼吸缩放
    const t = this.left / EMOJI_TIME;
    this.sprite.position.y = 1.25 + (1 - t) * 0.3;
    this.sprite.scale.setScalar(1 * (0.92 + Math.sin(elapsed * 5) * 0.06));
    this.sprite.material.opacity = Math.min(1, t * 3);
  }

  dispose(): void {
    this.texture.dispose();
    this.sprite.material.dispose();
  }
}

/** 闲玩时随机冒的表情池 */
const PLAY_EMOJIS = ['🐕', '❤️', '✨', '🐾', '🎾', '😊', '🥰'];
/** 跟随路上偶尔冒的表情池 */
const FOLLOW_EMOJIS = ['🏃', '💨', '❤️'];

/**
 * 黑色博美伴侣:出生在玩家身旁,被附近地面上的肉块吸引,吃完回来继续跟随玩家;
 * 距离玩家够近时不跟了,围着玩家转圈或原地打转自己玩,时不时头顶冒个小表情。
 */
export class Pomeranian {
  readonly group = new THREE.Group();
  private model: DogModel;
  private bubble = new EmojiBubble();
  private pos = new THREE.Vector3();
  private heading = 0;
  /** 进食动作剩余时间(低头咀嚼,不可移动) */
  private eatLeft = 0;
  /** 吃饱后的开心转圈剩余时间 */
  private happyLeft = 0;
  /** 当前闲玩行为与其剩余时长 */
  private play: Play = 'circle';
  private playLeft = 0;
  /** 围着玩家转圈的绕行方向(1 逆时针 / -1 顺时针) */
  private orbitDir = 1;
  /** 闲玩时随机发表情的倒计时 */
  private emojiTimer = 1.5;
  /** 上一帧是否在跟随:开始跟随时发一次表情 */
  private wasFollowing = false;
  /** 玩家走远后重新回到身边时发一次「想念你」 */
  private waitingForReturn = false;
  /** 出场打过招呼没 */
  private greeted = false;

  constructor(
    scene: THREE.Scene,
    private terrain: IslandTerrain,
    private player: Player,
    /** 围栏等静态阻挡:点在阻挡内时不可走 */
    private isBlocked: (x: number, z: number) => boolean = () => false
  ) {
    this.model = makePomeranianModel();
    this.group.add(this.model.group, this.bubble.sprite);
    this.placeNear(player.group.position, 1.5);
    scene.add(this.group);
  }

  /** 某点是否为可站立的干地 */
  private walkable(x: number, z: number): boolean {
    if (this.isBlocked(x, z)) return false;
    return this.terrain.getHeight(x, z) > LAND_MIN;
  }

  /** 在 anchor 附近找一块干地落脚 */
  private placeNear(anchor: THREE.Vector3, radius: number): void {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = radius + Math.random() * 0.8;
      const x = anchor.x + Math.cos(a) * d;
      const z = anchor.z + Math.sin(a) * d;
      if (this.walkable(x, z)) {
        this.pos.set(x, this.terrain.getHeight(x, z), z);
        return;
      }
    }
    this.pos.set(anchor.x, Math.max(this.terrain.getHeight(anchor.x, anchor.z), 0), anchor.z);
  }

  /** 存档恢复:瞬移到存档位置 */
  restore(x: number, z: number): void {
    if (this.walkable(x, z)) this.pos.set(x, this.terrain.getHeight(x, z), z);
    else this.placeNear(this.player.group.position, 1.5);
  }

  snapshot(): { x: number; z: number } {
    return { x: this.pos.x, z: this.pos.z };
  }

  /** 朝目标走一步,返回是否仍在途中(前方不可走或已到达时返回 false) */
  private stepTo(target: THREE.Vector3, speed: number, delta: number): boolean {
    const dirX = target.x - this.pos.x;
    const dirZ = target.z - this.pos.z;
    const dist = Math.hypot(dirX, dirZ);
    if (dist < 0.15) return false;
    const nx = this.pos.x + (dirX / dist) * speed * delta;
    const nz = this.pos.z + (dirZ / dist) * speed * delta;
    this.heading = Math.atan2(dirZ, dirX);
    if (!this.walkable(nx, nz)) return false;
    this.pos.set(nx, this.terrain.getHeight(nx, nz), nz);
    return true;
  }

  /** 挑下一个闲玩行为:优先围着玩家转圈 */
  private nextPlay(): void {
    const pool: Play[] = ['circle', 'circle', 'circle', 'spin', 'sit'];
    this.play = pool[Math.floor(Math.random() * pool.length)];
    this.playLeft = this.play === 'spin' ? 1.8 : 3 + Math.random() * 3;
    if (this.play === 'circle') this.orbitDir = Math.random() < 0.5 ? 1 : -1;
  }

  /** 绕玩家转圈:沿环绕切线方向走一步,路被挡就换方向 */
  private orbitPlayer(speed: number, delta: number, radius: number): boolean {
    const p = this.player.group.position;
    const ox = this.pos.x - p.x;
    const oz = this.pos.z - p.z;
    const r = Math.hypot(ox, oz) || 0.001;
    // 切线方向 + 轻微向目标半径回收,走出一条绕着玩家的螺旋圈
    const tangent = Math.atan2(oz, ox) + this.orbitDir * (Math.PI / 2);
    const pull = (radius - r) / radius;
    const dirX = Math.cos(tangent) + (ox / r) * pull;
    const dirZ = Math.sin(tangent) + (oz / r) * pull;
    const len = Math.hypot(dirX, dirZ) || 1;
    const nx = this.pos.x + (dirX / len) * speed * delta;
    const nz = this.pos.z + (dirZ / len) * speed * delta;
    if (!this.walkable(nx, nz)) {
      this.orbitDir *= -1;
      return false;
    }
    this.heading = Math.atan2(dirZ, dirX);
    this.pos.set(nx, this.terrain.getHeight(nx, nz), nz);
    return true;
  }

  update(delta: number, elapsed: number, drops: DropSystem): void {
    if (!this.greeted) {
      this.greeted = true;
      this.bubble.show('🐶');
    }
    const p = this.player.group.position;
    const playerDist = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
    let moving = false;
    let excited = false;

    if (this.eatLeft > 0) {
      // 进食中:原地低头咀嚼
      this.eatLeft -= delta;
    } else if (this.happyLeft > 0) {
      // 吃饱了:原地开心转圈
      this.happyLeft -= delta;
      this.heading += delta * 10;
      excited = true;
    } else {
      // 1) 附近有肉块:优先跑去吃
      const meat = drops.nearestMeat(this.pos, SMELL_RANGE);
      if (meat) {
        if (Math.hypot(meat.x - this.pos.x, meat.z - this.pos.z) <= EAT_RANGE) {
          if (drops.consumeMeatNear(this.pos, EAT_RANGE)) {
            this.eatLeft = EAT_DURATION;
            this.happyLeft = HAPPY_DURATION;
            this.bubble.show(Math.random() < 0.5 ? '😋' : '🦴');
          }
        } else {
          moving = this.stepTo(meat, RUN_SPEED, delta);
          excited = true;
        }
        this.waitingForReturn = false;
        this.wasFollowing = false;
      } else if (playerDist > FOLLOW_RANGE) {
        // 2) 玩家走远:跟上去(玩家下水时追到岸边等待)
        if (!this.wasFollowing) {
          this.wasFollowing = true;
          this.bubble.show('🐕');
        }
        moving = this.stepTo(p, playerDist > 8 ? RUN_SPEED : TROT_SPEED, delta);
        excited = playerDist > 8;
        if (!this.waitingForReturn && playerDist > 14) this.waitingForReturn = true;
      } else {
        // 3) 玩家在身边:自己玩
        this.wasFollowing = false;
        if (this.waitingForReturn) {
          this.waitingForReturn = false;
          this.bubble.show('🥰');
        }
        this.playLeft -= delta;
        if (this.playLeft <= 0) this.nextPlay();
        if (this.play === 'circle') {
          moving = this.orbitPlayer(TROT_SPEED * 0.55, delta, 1.6 + Math.sin(elapsed * 0.5) * 0.5);
        } else if (this.play === 'spin') {
          // 追尾巴:原地打转
          this.heading += delta * 9;
          excited = true;
        }
        // sit:原地趴坐休息,只摇尾巴
        this.emojiTimer -= delta;
        if (this.emojiTimer <= 0) {
          this.bubble.show(PLAY_EMOJIS[Math.floor(Math.random() * PLAY_EMOJIS.length)]);
          this.emojiTimer = PLAY_EMOJI_INTERVAL / 2 + Math.random() * PLAY_EMOJI_INTERVAL;
        }
      }
    }

    this.animate(elapsed, moving, excited);
    this.bubble.update(delta, elapsed);
  }

  /** 应用位置与朝向,跑动摆腿、摇尾巴与咀嚼点头 */
  private animate(elapsed: number, moving: boolean, excited: boolean): void {
    const g = this.model.group;
    g.position.set(this.pos.x, this.pos.y, this.pos.z);
    g.rotation.y = -this.heading + Math.PI / 2;

    const speed = moving ? (excited ? 16 : 10) : 0;
    this.model.legs.forEach((leg, i) => {
      const swing = moving ? Math.sin(elapsed * speed + i * Math.PI * 0.5) * 0.7 : 0;
      leg.rotation.x = swing;
    });

    // 尾巴永远在摇,兴奋/追尾巴时摇成残影
    const wag = this.play === 'spin' || this.happyLeft > 0
      ? Math.sin(elapsed * 26) * 0.9
      : Math.sin(elapsed * (excited ? 18 : 9)) * (excited ? 0.6 : 0.4);
    this.model.tail.rotation.y = wag;

    // 头部:进食时低头,平时随呼吸轻点
    const eating = this.eatLeft > 0;
    const nod = eating ? 0.7 + Math.sin(elapsed * 12) * 0.12 : Math.sin(elapsed * 2.2) * 0.04;
    this.model.head.rotation.x = nod;

    // 跑动时轻微起伏
    const bounce = moving ? Math.abs(Math.sin(elapsed * speed)) * 0.02 : 0;
    this.model.body.position.y = 0.21 + bounce;
    this.model.head.position.y = 0.39 + bounce;
  }

  dispose(): void {
    this.bubble.dispose();
  }
}
