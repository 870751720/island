import type { Game } from '../Game';
import type { PlayerSession } from '../mp/PlayerSession';
import type { SaveData, SessionSave } from '../systems/SaveSystem';
import { PeerNet } from './PeerNet';
import { HostSignal } from './Signaling';
import { ACTIONS } from './Actions';
import { NET_PROTOCOL_VERSION, type NetEvent, type NetMsg } from './Protocol';
import type { EntityChange } from '../systems/WorldEntityId';
import type { WorldSection } from './WorldDelta';
import { diffEntities, diffObject, quantize } from './SnapshotDelta';
import type { AmbientPose, AnimalPose, PlayerState } from './Protocol';
import type { HudSnapshot } from '../Game';

const INPUT_TIMEOUT = 10_000; // 客人这么久没有任何消息视为断线
const RESUME_GRACE = 300_000; // 断线席位保留时长:期间用原房间码重新加入可按离场快照恢复角色
const FAST_TICK_MS = 40; // 玩家与战斗动物 25Hz
const NORMAL_TICK_MS = 100; // 普通动物与环境生物 10Hz
const HUD_TICK_MS = 200;
const RECOVERY_MS = 5000;

/** 一名已接入的客人 */
type Guest = {
  peer: string;
  net: PeerNet;
  session: PlayerSession | null;
  name: string;
  lastSeen: number;
  resumeToken: string;
  lastInputSeq: number;
  players: Map<string | number, PlayerState>;
  combatAnimals: Map<string | number, AnimalPose>;
  passiveAnimals: Map<string | number, AnimalPose>;
  crabs: Map<string | number, AmbientPose>;
  birds: Map<string | number, AmbientPose>;
  butterflies: Map<string | number, AmbientPose>;
  dog: AmbientPose | null;
  hud: Omit<HudSnapshot, 'notice'> | null;
  climate: string;
};

type Resumable = { save: SessionSave; name: string; expires: number };

/** 房主侧联机会话总管:管理多条 DataChannel、接入/断线、输入写入、动作分发与快照广播 */
export class NetHost {
  terrainSeed: number;
  initialSave: SaveData | null = null;
  private guests: Guest[] = [];
  private game: Game | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private normalElapsed = NORMAL_TICK_MS;
  private hudElapsed = HUD_TICK_MS;
  private recoveryElapsed = RECOVERY_MS;
  private worldRevision = 0;
  private resumable = new Map<string, Resumable>();
  private signal: HostSignal | null = null;
  roomCode = '';

  onGuestJoined: (name: string) => void = () => {};
  onGuestLeft: (name: string) => void = () => {};

  constructor() {
    this.terrainSeed = Math.random() * 1000;
  }

  useSavedWorld(save: SaveData | null): void {
    this.initialSave = save;
    if (save) {
      this.terrainSeed = save.terrainSeed;
    }
  }

  /** 已接入的客人名字(含未开始的) */
  get guestNames(): string[] {
    return this.guests.filter((g) => g.net.connected || g.session).map((g) => g.name || '朋友');
  }

  /** 创建五位数字码房间；之后加入者由信令服务自动接入。 */
  async createRoom(): Promise<string> {
    this.purgeResumable();
    const room = await HostSignal.create();
    this.signal = room.signal;
    this.roomCode = room.roomCode;
    room.signal.onPeerJoined = (peer) => void this.addPeer(peer);
    room.signal.onSignal = (peer, data) => {
      const guest = this.guests.find((item) => item.peer === peer);
      if (guest) void guest.net.receiveSignal(data).catch(() => this.dropGuest(guest));
    };
    return room.roomCode;
  }

  private async addPeer(peer: string): Promise<void> {
    if (!this.signal || this.guests.some((guest) => guest.peer === peer)) return;
    this.purgeResumable();
    const net = new PeerNet('host', (data) => this.signal?.send(peer, data));
    const guest: Guest = {
      peer,
      net,
      session: null,
      name: '',
      lastSeen: performance.now(),
      resumeToken: crypto.randomUUID(),
      lastInputSeq: 0,
      players: new Map(), combatAnimals: new Map(), passiveAnimals: new Map(), crabs: new Map(), birds: new Map(), butterflies: new Map(),
      dog: null, hud: null, climate: '',
    };
    this.guests.push(guest);
    net.onMessage = (msg) => this.onMessage(guest, msg as NetMsg);
    net.onClose = () => this.dropGuest(guest);
    try {
      await net.start();
    } catch {
      this.dropGuest(guest);
    }
  }

  /** 游戏创建后挂接:为已连客人建会话并发欢迎包,开始按帧广播 */
  attach(game: Game): void {
    this.game = game;
    // 信令保持在线:断线客人需要它重新握手,用原房间码回来即可恢复席位
    for (const guest of this.guests) {
      if (guest.net.connected && !guest.session) this.welcome(guest);
    }
    if (!this.timer) this.timer = setInterval(() => this.tick(), FAST_TICK_MS);
  }

  /** 退出游戏时停止广播 */
  detach(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.game = null;
  }

  dispose(): void {
    this.detach();
    for (const guest of this.guests) guest.net.close();
    this.guests = [];
    this.signal?.close();
    this.signal = null;
  }

  private onMessage(guest: Guest, msg: NetMsg): void {
    guest.lastSeen = performance.now();
    if (msg.t === 'hello') {
      if (msg.protocol !== NET_PROTOCOL_VERSION) {
        guest.net.send({ t: 'reject', reason: '双方游戏版本不一致，请刷新页面后重试' });
        setTimeout(() => this.dropGuest(guest), 100);
        return;
      }
      const resume = msg.resumeToken ? this.resumable.get(msg.resumeToken) : undefined;
      if (this.game && resume && resume.expires > performance.now()) {
        this.resumable.delete(msg.resumeToken!);
        guest.session = this.game.resumeRemoteSession(resume.save, resume.name);
        guest.name = resume.name;
        guest.resumeToken = msg.resumeToken!;
      } else {
        guest.name = msg.name?.trim().slice(0, 16) || '朋友';
      }
      if (this.game && !guest.session) this.welcome(guest);
      else if (this.game) this.sendWelcome(guest);
      this.onGuestJoined(guest.name);
    } else if (msg.t === 'heartbeat') {
      return;
    } else if (msg.t === 'input' && guest.session) {
      if (!Number.isSafeInteger(msg.seq) || msg.seq <= guest.lastInputSeq) return;
      const x = Number.isFinite(msg.x) ? Math.max(-1, Math.min(1, msg.x)) : 0;
      const z = Number.isFinite(msg.z) ? Math.max(-1, Math.min(1, msg.z)) : 0;
      guest.session.player.input.setJoystick(x, z);
      guest.lastInputSeq = msg.seq;
    } else if (msg.t === 'action' && guest.session && this.game) {
      if (typeof msg.name !== 'string' || !Array.isArray(msg.args) || msg.args.length > 8) return;
      const game = this.game;
      const session = guest.session;
      game.runNetAction(session, () => ACTIONS[msg.name]?.(game, session, msg.args));
    } else if (msg.t === 'worldResync' && guest.session && this.game) {
      guest.net.send({ t: 'worldFull', revision: this.worldRevision, state: this.game.netWorldState() });
    }
  }

  private welcome(guest: Guest): void {
    if (!this.game || guest.session) return;
    // 断线保留期内的新客人不能认领仍在保留期中的角色
    const held = [...this.resumable.values()].map((entry) => entry.save.id);
    guest.session = this.game.claimSavedRemoteSession(guest.name, held) ?? this.game.addRemoteSession(false, undefined, guest.name);
    this.sendWelcome(guest);
  }

  private sendWelcome(guest: Guest): void {
    if (!this.game || !guest.session) return;
    guest.net.send({
      t: 'welcome',
      seeds: { terrainSeed: this.terrainSeed },
      state: this.game.collectSave(true),
      roster: this.game.sessionIds(),
      you: guest.session.id,
      protocol: NET_PROTOCOL_VERSION,
      resumeToken: guest.resumeToken,
      worldRevision: this.worldRevision,
    });
    guest.net.send({ t: 'start' });
  }

  broadcastEvent(event: NetEvent): void {
    for (const guest of this.guests) {
      if (guest.net.connected && guest.session) guest.net.send({ t: 'event', event });
    }
  }

  /** 权威世界系统的离散变化直接进入可靠控制通道。 */
  broadcastWorldChange(section: WorldSection, change: EntityChange): void {
    const op = change.op === 'add'
      ? { section, key: change.id, op: 'add' as const, value: change.value }
      : change.op === 'remove'
        ? { section, key: change.id, op: 'remove' as const }
        : { section, key: change.id, op: 'set' as const, fields: change.fields };
    const revision = ++this.worldRevision;
    for (const guest of this.guests) {
      if (guest.net.connected && guest.session) guest.net.send({ t: 'worldDelta', revision, ops: [op] });
    }
  }

  private dropGuest(guest: Guest): void {
    const index = this.guests.indexOf(guest);
    if (index < 0) return;
    this.guests.splice(index, 1);
    if (guest.session && this.game) {
      guest.session.player.input.setJoystick(0, 0);
      // 角色立即移出世界,离场快照保留 5 分钟供原玩家重连恢复
      const save = this.game.suspendRemoteSession(guest.session);
      this.resumable.set(guest.resumeToken, { save, name: guest.name, expires: performance.now() + RESUME_GRACE });
    }
    guest.net.close();
    this.onGuestLeft(guest.name || '朋友');
  }

  /** 40ms 一拍：玩家与战斗动物 25Hz；普通动物/环境 10Hz；HUD 5Hz 检查。 */
  private tick(): void {
    const game = this.game;
    if (!game) return;
    this.purgeResumable();
    this.normalElapsed += FAST_TICK_MS;
    this.hudElapsed += FAST_TICK_MS;
    this.recoveryElapsed += FAST_TICK_MS;
    // 实时通道允许丢包：低频全量关键帧只用于自动修复漏掉的增量，不承担日常同步。
    const recoveryFrame = this.recoveryElapsed >= RECOVERY_MS;
    const normalFrame = this.normalElapsed >= NORMAL_TICK_MS;
    const hudFrame = this.hudElapsed >= HUD_TICK_MS;
    if (recoveryFrame) this.recoveryElapsed %= RECOVERY_MS;
    if (normalFrame) this.normalElapsed %= NORMAL_TICK_MS;
    if (hudFrame) this.hudElapsed %= HUD_TICK_MS;
    const now = performance.now();
    for (const guest of [...this.guests]) {
      if (now - guest.lastSeen > INPUT_TIMEOUT) {
        this.dropGuest(guest);
        continue;
      }
      if (!guest.net.connected || !guest.session) continue;
      const state = game.netPlayersState();
      const qPlayers = state.list.map((p) => ({ ...p, x: quantize(p.x, .02), y: quantize(p.y, .02), z: quantize(p.z, .02), rotY: quantize(p.rotY, .01), hunger: quantize(p.hunger, .1), thirst: quantize(p.thirst, .1), health: quantize(p.health, .1), stamina: quantize(p.stamina, .1) }));
      const players = diffEntities(qPlayers, guest.players, recoveryFrame);
      const climate = { time: quantize(state.time, .01), day: state.day, weather: state.weather, rain: quantize(state.rain, .02), windAmount: quantize(state.windAmount, .02), windDirX: quantize(state.windDirX, .02), windDirZ: quantize(state.windDirZ, .02) };
      const climateKey = JSON.stringify(climate);
      if (players || climateKey !== guest.climate) {
        const climateChanged = climateKey !== guest.climate;
        guest.climate = climateKey;
        guest.net.send({ t: 'players', ...(climateChanged ? climate : {}), ackInputSeq: guest.lastInputSeq, players: players ?? {} });
      }

      const quantizeAnimals = (list: AnimalPose[]) => list.map((p) => ({ ...p, x: quantize(p.x, .04), z: quantize(p.z, .04), h: quantize(p.h, .02) }));
      if (recoveryFrame) guest.combatAnimals.clear();
      const combatAnimals = diffEntities(quantizeAnimals(game.netCombatAnimalsState()), guest.combatAnimals);
      let passiveAnimals = null;
      if (normalFrame || recoveryFrame) {
        if (recoveryFrame) guest.passiveAnimals.clear();
        passiveAnimals = diffEntities(quantizeAnimals(game.netPassiveAnimalsState()), guest.passiveAnimals);
      }
      const animalSets = [...(combatAnimals?.set ?? []), ...(passiveAnimals?.set ?? [])];
      const animalRemoves = [...(combatAnimals?.remove ?? []), ...(passiveAnimals?.remove ?? [])];
      if (animalSets.length || animalRemoves.length) guest.net.send({ t: 'animals', animals: { set: animalSets.length ? animalSets : undefined, remove: animalRemoves.length ? animalRemoves : undefined } });

      if (normalFrame || recoveryFrame) {
      const ambient = game.netAmbientState();
      const qAmbient = (list: AmbientPose[]) => list.map((p) => ({ ...p, x: quantize(p.x, .05), y: quantize(p.y, .05), z: quantize(p.z, .05), h: quantize(p.h, .03) }));
      const crabs = diffEntities(qAmbient(ambient.crabs), guest.crabs, recoveryFrame);
      const birds = diffEntities(qAmbient(ambient.birds), guest.birds, recoveryFrame);
      const butterflies = diffEntities(qAmbient(ambient.butterflies), guest.butterflies, recoveryFrame);
      const dogNow = qAmbient([ambient.dog])[0];
      const dog = recoveryFrame ? dogNow : diffObject(dogNow, guest.dog);
      guest.dog = dogNow;
      if (crabs || birds || butterflies || dog) guest.net.send({ t: 'ambient', crabs: crabs ?? undefined, birds: birds ?? undefined, butterflies: butterflies ?? undefined, dog: dog ?? undefined });
      }

      if (hudFrame) {
        const hud = game.hudFor(guest.session);
        const snap = diffObject(hud, guest.hud);
        const full = !guest.hud;
        guest.hud = hud;
        if (snap) guest.net.send({ t: 'hud', snap, full });
      }
    }
  }

  private purgeResumable(): void {
    const now = performance.now();
    for (const [token, entry] of this.resumable) {
      // 快照已留在 Game 的待恢复列表中,过期后仍可被同名新客人认领或随存档保留
      if (entry.expires <= now) this.resumable.delete(token);
    }
  }
}
