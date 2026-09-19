import { PeerNet } from './PeerNet';
import type { GameConnection } from './GameConnection';
import { parseConnectionMode, type ConnectionMode } from './ConnectionMode';
import { RelayRoom } from './RelayRoom';
import { GuestSignal, normalizeRoomCode } from './Signaling';
import { NET_PROTOCOL_VERSION, type NetMsg, type AnimalPose, type AmbientState, type NetEvent, type WorldPatch } from './Protocol';
import type { WorldDeltaOp } from './WorldDelta';
import type { SaveData } from '../systems/SaveSystem';
import type { HudSnapshot } from '../GameContracts';
import type { NetActionArgs, NetActionName } from './ActionProtocol';
import type { PlayerGender } from '../entities/PlayerModel';
import { applyEntityDelta } from './SnapshotDelta';
import type { AmbientPose, PlayerState } from './Protocol';
import type { OwnerPose } from './OwnerState';

const INPUT_HZ = 20; // 本人姿态上行频率
const RESUME_KEY = 'island.multiplayer.resume';
const LAST_ROOM_KEY = 'island.multiplayer.lastRoom';

/** 记住最近加入的房间码、昵称和连接方式，断线后回到加入页自动带出。 */
export function saveLastRoom(code: string, name: string, mode: ConnectionMode = 'direct'): void {
  try {
    window.localStorage.setItem(LAST_ROOM_KEY, JSON.stringify({ code: normalizeRoomCode(code), name, mode }));
  } catch {}
}

export function loadLastRoom(): { code: string; name: string; mode: ConnectionMode } | null {
  try {
    const raw = window.localStorage.getItem(LAST_ROOM_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { code?: string; name?: string; mode?: string };
    if (!saved.code) return null;
    return { code: saved.code, name: saved.name ?? '', mode: parseConnectionMode(saved.mode) };
  } catch {
    return null;
  }
}

/** 客人侧联机会话：上行本人姿态/动作，下行世界与快照交给 Game 的 guest 模式应用。 */
export class NetGuest {
  private net: GameConnection | null = null;
  private relay: RelayRoom | null = null;
  connectionMode: ConnectionMode = 'direct';
  private signal: GuestSignal | null = null;
  dogView = { width: 0, height: 0 };
  private inputTimer: ReturnType<typeof setInterval> | null = null;
  private lastInputSent = 0;
  private inputSeq = 0;
  private actionSeq = 0;
  private receipts = new Map<number, (accepted: boolean) => void>();
  readPose: (() => Omit<OwnerPose, 'seq'>) | null = null;
  readTarget: (name: NetActionName) => string | null | undefined = () => undefined;
  private lastHeartbeatSent = 0;
  private disposed = false;
  private ready = false;
  private pending: NetMsg[] = [];
  private players = new Map<string | number, PlayerState>();
  private animals = new Map<string | number, AnimalPose>();
  private crabs = new Map<string | number, AmbientPose>();
  private birds = new Map<string | number, AmbientPose>();
  private butterflies = new Map<string | number, AmbientPose>();
  private dog: AmbientPose | null = null;
  private hud: HudSnapshot | null = null;
  /** 房主发来的欢迎包(种子 + 全量初始状态 + 稳定玩家标识),开始游戏时交给 Game */
  welcome: { seeds: { terrainSeed: number }; state: SaveData; roster: string[]; you: string; worldRevision: number } | null =
    null;

  onStarted: () => void = () => {};
  onClosed: (reason?: string) => void = () => {};
  onRejected: (reason: string) => void = () => {};
  onConnectionStatus: (status: string) => void = () => {};
  /** 由 Game(guest 模式)注册的数据应用回调 */
  onPlayers: (msg: Extract<NetMsg, { t: 'players' }>) => void = () => {};
  onAnimals: (list: AnimalPose[]) => void = () => {};
  onAmbient: (state: AmbientState) => void = () => {};
  onWorldDelta: (revision: number, ops: WorldDeltaOp[]) => void = () => {};
  onWorldFull: (revision: number, state: WorldPatch) => void = () => {};
  onHud: (snap: HudSnapshot) => void = () => {};
  onEvent: (event: NetEvent) => void = () => {};

  /** 输入五位数字房间码，按房主选择的连接方式加入。 */
  async join(code: string, name: string, gender?: PlayerGender, mode: ConnectionMode = 'direct'): Promise<void> {
    this.dispose();
    this.disposed = false;
    this.pending = [];
    this.welcome = null;
    this.ready = false;
    this.players.clear();
    this.animals.clear();
    this.crabs.clear();
    this.birds.clear();
    this.butterflies.clear();
    this.dog = null;
    this.hud = null;
    this.connectionMode = mode;
    if (mode === 'relay') return this.joinRelay(code, name, gender);
    const signal = new GuestSignal();
    const net = new PeerNet('guest', (data) => signal.send(data));
    this.signal = signal;
    this.net = net;
    net.onMessage = (raw) => {
      if (this.net === net && !this.disposed) this.onMessage(raw as NetMsg);
    };
    net.onOpen = () => {
      if (this.net !== net || this.disposed) return;
      this.startInput();
      this.onConnectionStatus('连接成功，等待房主开始游戏');
      signal.close();
      this.signal = null;
    };
    net.onClose = () => {
      if (this.net !== net || this.disposed) return;
      this.dispose();
      this.onClosed();
    };
    signal.onSignal = (data) => {
      if (this.net === net && !this.disposed) void net.receiveSignal(data).catch(() => net.onClose());
    };
    signal.onStatus = (status) => {
      if (this.net === net && !this.disposed) this.onConnectionStatus(status);
    };
    signal.onReady = () => {
      if (this.net !== net || this.disposed) return;
      net.beginHandshake();
      this.onConnectionStatus('已找到房间，正在连接房主（最多等待 30 秒）…');
    };
    signal.onClose = () => {
      if (!net.connected) net.onClose();
    };
    this.sendHello(name, gender);
    saveLastRoom(code, name);
    try {
      await signal.connect(normalizeRoomCode(code));
    } catch (error) {
      if (this.net !== net || this.disposed) return;
      this.dispose();
      throw error;
    }
  }

  private sendHello(name: string, gender?: PlayerGender): void {
    let resumeToken: string | undefined;
    try { resumeToken = localStorage.getItem(RESUME_KEY) || undefined; } catch {}
    this.net?.send({ t: 'hello', name, protocol: NET_PROTOCOL_VERSION, resumeToken, gender });
  }

  private async joinRelay(code: string, name: string, gender?: PlayerGender): Promise<void> {
    const relay = new RelayRoom('guest');
    const net = relay.guestPeer();
    this.relay = relay;
    this.net = net;
    net.onMessage = raw => {
      if (this.net === net && !this.disposed) this.onMessage(raw as NetMsg);
    };
    net.onOpen = () => {
      if (this.net !== net || this.disposed) return;
      this.sendHello(name, gender);
      this.startInput();
      this.onConnectionStatus('连接成功，等待房主开始游戏');
    };
    relay.onClosed = reason => {
      if (this.relay !== relay || this.disposed) return;
      this.dispose();
      this.onClosed(reason);
    };
    net.onClose = () => {
      if (this.net !== net || this.disposed) return;
      this.dispose();
      this.onClosed('与房主的连接已结束，请重新加入');
    };
    saveLastRoom(code, name, 'relay');
    this.onConnectionStatus('正在通过服务器连接房主…');
    try { await relay.connect(normalizeRoomCode(code)); }
    catch (error) {
      if (this.net !== net || this.disposed) return;
      this.dispose();
      throw error;
    }
  }

  /** 收到 start 后由 Game 调用:开始按频率上行本人姿态并应用下行数据 */
  begin(): void {
    this.ready = true;
    for (const msg of this.pending.splice(0)) this.onMessage(msg);
    this.startInput();
  }

  dispose(): void {
    this.disposed = true;
    this.stopInput();
    this.net?.close();
    this.signal?.close();
    this.net = null;
    this.signal = null;
    this.relay?.close();
    this.relay = null;
    for (const done of this.receipts.values()) done(false);
    this.receipts.clear();
  }

  private onMessage(msg: NetMsg): void {
    if (!this.ready && !['welcome', 'start', 'reject'].includes(msg.t)) {
      this.pending.push(msg);
      return;
    }
    switch (msg.t) {
      case 'actionResult': {
        const done = this.receipts.get(msg.seq);
        this.receipts.delete(msg.seq);
        done?.(msg.accepted);
        break;
      }
      case 'welcome':
        if (msg.protocol !== NET_PROTOCOL_VERSION) {
          this.onRejected('双方游戏版本不一致，请刷新页面后重试');
          this.dispose();
          break;
        }
        this.welcome = { seeds: msg.seeds, state: msg.state, roster: msg.roster, you: msg.you, worldRevision: msg.worldRevision };
        try {
          localStorage.setItem(RESUME_KEY, msg.resumeToken);
        } catch {}
        break;
      case 'reject':
        this.onRejected(msg.reason);
        this.dispose();
        break;
      case 'start':
        this.onStarted();
        break;
      case 'players':
        this.onPlayers({ ...msg, players: { full: applyEntityDelta(msg.players, this.players) } });
        break;
      case 'animals':
        this.onAnimals(applyEntityDelta(msg.animals, this.animals));
        break;
      case 'ambient':
        if (msg.crabs) applyEntityDelta(msg.crabs, this.crabs);
        if (msg.birds) applyEntityDelta(msg.birds, this.birds);
        if (msg.butterflies) applyEntityDelta(msg.butterflies, this.butterflies);
        if (msg.dog) this.dog = { ...(this.dog ?? msg.dog), ...msg.dog } as AmbientPose;
        if (this.dog) this.onAmbient({ crabs: [...this.crabs.values()], birds: [...this.birds.values()], butterflies: [...this.butterflies.values()], dog: this.dog });
        break;
      case 'worldDelta':
        this.onWorldDelta(msg.revision, msg.ops);
        break;
      case 'worldFull':
        this.onWorldFull(msg.revision, msg.state);
        break;
      case 'hud':
        this.hud = { ...(this.hud ?? {}), ...msg.snap } as HudSnapshot;
        this.onHud(this.hud);
        break;
      case 'event':
        this.onEvent(msg.event);
        break;
      default:
        break;
    }
  }

  private pose(): OwnerPose | null {
    return this.readPose ? { ...this.readPose(), seq: ++this.inputSeq } : null;
  }

  private startInput(): void {
    if (this.inputTimer) return;
    this.inputTimer = setInterval(() => {
      const now = performance.now();
      if (now - this.lastInputSent < 1000 / INPUT_HZ) return;
      this.lastInputSent = now;
      if (now - this.lastHeartbeatSent >= 1000) {
        this.lastHeartbeatSent = now;
        this.net?.send({ t: 'heartbeat' });
      }
      if (this.ready) {
        const pose = this.pose();
        if (pose) this.net?.send({ t: 'ownerPose', pose, viewWidth: this.dogView.width, viewHeight: this.dogView.height });
      }
    }, 1000 / INPUT_HZ / 2);
  }

  private stopInput(): void {
    if (this.inputTimer) clearInterval(this.inputTimer);
    this.inputTimer = null;
  }

  /** 把一次按钮动作发给房主权威结算(返回值仅表示已发出) */
  action<Name extends NetActionName>(name: Name, args: NetActionArgs[Name], done?: (accepted: boolean) => void): boolean {
    const pose = this.pose();
    if (!this.ready || !this.net?.connected || !pose || this.receipts.size >= 256) return false;
    const seq = ++this.actionSeq;
    if (done) this.receipts.set(seq, accepted => {
      if (this.readPose?.().epoch === pose.epoch) done(accepted);
    });
    this.net.send({ t: 'action', seq, pose, target: this.readTarget(name), name, args });
    return true;
  }

  requestWorldResync(revision: number): void {
    this.net?.send({ t: 'worldResync', revision });
  }
}
