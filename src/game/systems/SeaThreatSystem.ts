import * as THREE from 'three';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { WaterFx } from '../fx/WaterFx';
import type { MumbleSystem } from './MumbleSystem';
import type { PlayerSession } from '../mp/PlayerSession';
import { SeaPredator } from '../entities/SeaPredator';

/** 在海里泡多久开始恐慌自言自语 */
const PANIC_AT = 8;
/** 再过 5 秒:感觉海里有东西 */
const DREAD_AT = 13;
/** 再过 4 秒:巨影现身开始攻击 */
const SPAWN_AT = 17;
/** 咬击间隔与固定伤害 */
const ATTACK_INTERVAL = 2;
const ATTACK_DAMAGE = 33;
/** 巨影现身到第一口之间的表演缓冲(上浮淡入 + 起势) */
const FIRST_BITE_DELAY = 0.6;

/** 每名玩家的泡海计时(离水即整体作废重来) */
type Track = {
  seaTime: number;
  saidPanic: boolean;
  saidDread: boolean;
  attackTimer: number;
};

/**
 * 海中威胁系统:玩家在海水中游泳时累计时长,按 8s/13s/17s 三段推进——
 * 恐慌自言自语 → 察觉水下有东西 → 巨影现身,每 2 秒咬一口(固定 33 伤害)。
 * 每个客户端各自本地计时与表现(玩家位置本就随姿态快照回流,两端时序一致);
 * 伤害只在权威端(单机/房主)结算,经血量快照回流驱动客人端闪红与音效。
 */
export class SeaThreatSystem {
  private tracks = new Map<string, Track>();
  private predators = new Map<string, SeaPredator>();

  constructor(
    private scene: THREE.Scene,
    private terrain: IslandTerrain,
    private waterFx: WaterFx,
    private mumbles: MumbleSystem,
    private sessions: () => readonly PlayerSession[],
    private local: () => PlayerSession,
    /** 权威端为真:咬击造成真实伤害;客人端只跑表现 */
    private authoritative: boolean,
    /** 权威端咬击结算(伤害 + 受击表现 + 客人补播),由 Game 注入 */
    private onBite: (session: PlayerSession, damage: number) => void
  ) {}

  update(delta: number, elapsed: number): void {
    const live = new Set<string>();
    for (const session of this.sessions()) {
      const player = session.player;
      const p = player.group.position;
      // 只认真正的海水:水洼与涉水浅滩不算(免得巨影冲上膝盖深的水里咬人)
      const inSea =
        !session.survival.state.dead &&
        player.isSwimming &&
        this.terrain.getWaterKind(p.x, p.z) === 'sea';
      if (!inSea) continue;
      live.add(session.id);

      let track = this.tracks.get(session.id);
      if (!track) {
        track = { seaTime: 0, saidPanic: false, saidDread: false, attackTimer: 0 };
        this.tracks.set(session.id, track);
      }
      track.seaTime += delta;
      if (!track.saidPanic && track.seaTime >= PANIC_AT) {
        track.saidPanic = true;
        if (session === this.local()) this.mumbles.forceSay('seaPanic');
      }
      if (!track.saidDread && track.seaTime >= DREAD_AT) {
        track.saidDread = true;
        if (session === this.local()) this.mumbles.forceSay('seaDread');
      }
      if (track.seaTime < SPAWN_AT) continue;

      let predator = this.predators.get(session.id);
      if (!predator) {
        predator = new SeaPredator(this.scene, this.terrain.seaLevel, this.waterFx);
        this.predators.set(session.id, predator);
        track.attackTimer = -FIRST_BITE_DELAY;
      }
      track.attackTimer += delta;
      if (track.attackTimer >= ATTACK_INTERVAL) {
        track.attackTimer -= ATTACK_INTERVAL;
        predator.attack(p);
        if (this.authoritative) this.onBite(session, ATTACK_DAMAGE);
      }
    }
    this.tracks.forEach((_track, id) => {
      if (!live.has(id)) this.tracks.delete(id);
    });

    // 巨影统一推进:目标仍泡在海里就追着游,否则下潜离场;潜完即回收
    const byId = new Map<string, THREE.Vector3>();
    for (const session of this.sessions()) byId.set(session.id, session.player.group.position);
    this.predators.forEach((predator, id) => {
      predator.update(delta, elapsed, live.has(id) ? byId.get(id)! : null);
      if (predator.done) {
        predator.dispose();
        this.predators.delete(id);
      }
    });
  }

  dispose(): void {
    this.predators.forEach((predator) => predator.dispose());
    this.predators.clear();
    this.tracks.clear();
  }
}
