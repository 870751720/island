import { PeerNet } from './PeerNet';
import { GuestSignal, normalizeRoomCode } from './Signaling';
import { NET_PROTOCOL_VERSION, type NetMsg, type AnimalPose, type AmbientState, type NetEvent, type WorldPatch } from './Protocol';
import type { WorldDeltaOp } from './WorldDelta';
import type { SaveData } from '../systems/SaveSystem';
import type { HudSnapshot } from '../Game';
import { applyEntityDelta } from './SnapshotDelta';
import type { AmbientPose, PlayerState } from './Protocol';

const INPUT_HZ = 20; // 摇杆上行频率
const RESUME_KEY = 'island.multiplayer.resume';
const LAST_ROOM_KEY = 'island.multiplayer.lastRoom';

/** 记住最近加入的房间(码+昵称):断线后回到加入页自动带出,一键重进 */
export function saveLastRoom(code: string, name: string): void {
  try {
    window.localStorage.setItem(LAST_ROOM_KEY, JSON.stringify({ code: normalizeRoomCode(code), name }));
  } catch {}
}

export function loadLastRoom(): { code: string; name: string } | null {
  try {
    const raw = window.localStorage.getItem(LAST_ROOM_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { code?: string; name?: string };
    if (!saved.code) return null;
    return { code: saved.code, name: saved.name ?? '' };
  } catch {
    return null;
  }
}

/** 客人侧联机会话:单条 DataChannel,上行摇杆/动作,下行世界与快照交给 Game 的 guest 模式应用 */
export class NetGuest {
  private net: PeerNet | null = null;
  private signal: GuestSignal | null = null;
  private inputX = 0;
  private inputZ = 0;
  private inputTimer: ReturnType<typeof setInterval> | null = null;
  private lastInputSent = 0;
  private inputSeq = 0;
  private sentInputX = Number.NaN;
  private sentInputZ = Number.NaN;
  private lastHeartbeatSent = 0;
  private disposed = false;
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
  onClosed: () => void = () => {};
  onRejected: (reason: string) => void = () => {};
  /** 由 Game(guest 模式)注册的数据应用回调 */
  onPlayers: (msg: Extract<NetMsg, { t: 'players' }>) => void = () => {};
  onAnimals: (list: AnimalPose[]) => void = () => {};
  onAmbient: (state: AmbientState) => void = () => {};
  onWorldDelta: (revision: number, ops: WorldDeltaOp[]) => void = () => {};
  onWorldFull: (revision: number, state: WorldPatch) => void = () => {};
  onHud: (snap: HudSnapshot) => void = () => {};
  onEvent: (event: NetEvent) => void = () => {};
  /** 输入包实际入队时通知 Game，供权威快照对账保留本地预测轨迹。 */
  onInputSent: (seq: number) => void = () => {};

  /** 输入五位数字房间码，信令服务会自动完成 WebRTC 握手。 */
  async join(code: string, name: string): Promise<void> {
    const signal = new GuestSignal();
    const net = new PeerNet('guest', (data) => signal.send(data));
    this.signal = signal;
    this.net = net;
    net.onMessage = (raw) => this.onMessage(raw as NetMsg);
    net.onOpen = () => {
      signal.close();
      this.signal = null;
    };
    net.onClose = () => {
      this.stopInput();
      if (!this.disposed) this.onClosed();
    };
    signal.onSignal = (data) => void net.receiveSignal(data).catch(() => this.onClosed());
    signal.onClose = () => {
      if (!this.disposed && !net.connected) this.onClosed();
    };
    let resumeToken: string | undefined;
    try {
      resumeToken = localStorage.getItem(RESUME_KEY) || undefined;
    } catch {}
    net.send({ t: 'hello', name, protocol: NET_PROTOCOL_VERSION, resumeToken });
    saveLastRoom(code, name);
    await signal.connect(normalizeRoomCode(code));
  }

  /** 收到 start 后由 Game 调用:开始按频率上行摇杆并应用下行数据 */
  begin(): void {
    this.startInput();
  }

  dispose(): void {
    this.disposed = true;
    this.stopInput();
    this.net?.close();
    this.signal?.close();
  }

  private onMessage(msg: NetMsg): void {
    switch (msg.t) {
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

  /** 本地摇杆写入(由 Game.setJoystick 转发),按固定频率上行 */
  sendInput(x: number, z: number): void {
    this.inputX = x;
    this.inputZ = z;
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
      if (this.inputX !== this.sentInputX || this.inputZ !== this.sentInputZ) {
        this.sentInputX = this.inputX;
        this.sentInputZ = this.inputZ;
        const seq = ++this.inputSeq;
        this.net?.send({ t: 'input', seq, x: this.inputX, z: this.inputZ });
        this.onInputSent(seq);
      }
    }, 1000 / INPUT_HZ / 2);
  }

  private stopInput(): void {
    if (this.inputTimer) clearInterval(this.inputTimer);
    this.inputTimer = null;
  }

  /** 把一次按钮动作发给房主权威结算(返回值仅表示已发出) */
  action(name: string, args: unknown[]): boolean {
    this.net?.send({ t: 'action', name, args });
    return true;
  }

  requestWorldResync(revision: number): void {
    this.net?.send({ t: 'worldResync', revision });
  }
}
