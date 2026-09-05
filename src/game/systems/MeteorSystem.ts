import * as THREE from 'three';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Props } from '../world/Props';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';

/** 每个夜晚降临时降下陨石的概率 */
const METEOR_CHANCE = 0.5;
/** 陨石下落速度(米/秒)与起落高度、入射水平偏移 */
const FALL_SPEED = 22;
const FALL_HEIGHT = 26;
const FALL_SLANT = 9;
/** 落点与资源点/玩家的最小距离(与摆件放置逻辑同源:避开水面与被占住的地面) */
const PROP_BLOCK_RANGE = 1.2;
const PLAYER_SAFE_RANGE = 2.5;
/** 拖尾粒子喷射间隔(秒) */
const TRAIL_INTERVAL = 0.04;

/** 下落中的陨石:一颗灼热火球带拖尾,落地后固化为可采集的陨石资源点 */
type FallingMeteor = {
  group: THREE.Group;
  /** 落点(地面) */
  target: THREE.Vector3;
  /** 单位飞行方向 */
  dir: THREE.Vector3;
  trailTimer: number;
};

function clayMaterial(color: string, emissive?: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: emissive ?? '#000000',
    emissiveIntensity: emissive ? 0.9 : 0,
    flatShading: true,
    roughness: 1,
  });
}

/** 火球:橙红核心 + 几块外围碎块,下落中自转 */
function makeFireball(): THREE.Group {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 0),
    clayMaterial('#e8703a', '#c0392b')
  );
  core.castShadow = true;
  group.add(core);
  const chunkMat = clayMaterial('#8a4a2a', '#7a2e1a');
  const chunks: [number, number, number][] = [
    [0.5, 0.15, 0.2],
    [-0.42, -0.1, 0.35],
    [0.1, 0.45, -0.4],
  ];
  for (const [x, y, z] of chunks) {
    const chunk = new THREE.Mesh(new THREE.TetrahedronGeometry(0.16, 0), chunkMat);
    chunk.position.set(x, y, z);
    group.add(chunk);
  }
  return group;
}

/**
 * 每天夜晚有 1/2 概率降下一颗陨石:选一块与摆件放置规则一致的空地,
 * 火球拖着粒子尾巴从天而降,落地炸起尘土并变成可采集的陨石(产出同岩石)。
 */
export class MeteorSystem {
  private falling: FallingMeteor | null = null;
  private wasNight = false;

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    private props: Props,
    private player: { group: THREE.Group },
    private dayNight: { isNight: boolean },
    private fx: Particles,
    private audio: GameAudio
  ) {}

  update(delta: number): void {
    const night = this.dayNight.isNight;
    if (night && !this.wasNight && !this.falling && Math.random() < METEOR_CHANCE) {
      this.launch();
    }
    this.wasNight = night;

    const m = this.falling;
    if (!m) return;
    const step = FALL_SPEED * delta;
    m.group.position.addScaledVector(m.dir, step);
    m.group.rotation.y += delta * 6;
    m.group.rotation.x += delta * 3;

    m.trailTimer -= delta;
    if (m.trailTimer <= 0) {
      m.trailTimer = TRAIL_INTERVAL;
      this.fx.burst(m.group.position, '#e8703a', 2);
    }

    if (m.group.position.distanceTo(m.target) <= step) {
      this.impact(m.target);
    }
  }

  /** 在岛上找一块合法落点并从高空扔下火球 */
  private launch(): void {
    const spot = this.pickSpot();
    if (!spot) return;
    const start = spot.clone().add(new THREE.Vector3(FALL_SLANT, FALL_HEIGHT, FALL_SLANT * 0.6));
    const group = makeFireball();
    group.position.copy(start);
    this.scene.add(group);
    this.falling = {
      group,
      target: spot,
      dir: spot.clone().sub(start).normalize(),
      trailTimer: 0,
    };
  }

  /** 落点:随机找一块不低于水面、离水边远、未被资源点/玩家占住的干地 */
  private pickSpot(): THREE.Vector3 | null {
    const maxX = this.terrain.halfWidth * 0.85;
    const maxZ = this.terrain.halfLength * 0.85;
    const p = this.player.group.position;
    for (let tries = 0; tries < 40; tries++) {
      const x = (Math.random() * 2 - 1) * maxX;
      const z = (Math.random() * 2 - 1) * maxZ;
      const y = this.terrain.getHeight(x, z);
      if (y <= 0.3) continue;
      const pos = new THREE.Vector3(x, y, z);
      if (this.terrain.isNearWater(pos, 1)) continue;
      if (Math.hypot(p.x - x, p.z - z) < PLAYER_SAFE_RANGE) continue;
      const blocked = this.props.list.some((prop) => {
        const dx = prop.position.x - x;
        const dz = prop.position.z - z;
        return dx * dx + dz * dz < PROP_BLOCK_RANGE * PROP_BLOCK_RANGE;
      });
      if (blocked) continue;
      return pos;
    }
    return null;
  }

  /** 落地:移除火球,炸起尘土,固化成陨石资源点 */
  private impact(target: THREE.Vector3): void {
    const m = this.falling!;
    this.scene.remove(m.group);
    this.falling = null;
    this.props.placeMeteor(target.x, target.z);
    this.audio.play('mine');
    this.fx.burst(target, '#e8703a', 16);
    this.fx.burst(target, '#8a6239', 12);
  }
}
