import type { Game } from '../Game';
import type { PlayerSession } from '../mp/PlayerSession';
import type { SaveData } from '../systems/SaveSystem';
import { PeerNet } from './PeerNet';
import { HostSignal } from './Signaling';
import { ACTIONS } from './Actions';
import { NET_PROTOCOL_VERSION, type NetEvent, type NetMsg } from './Protocol';
import type { EntityChange } from '../systems/WorldEntityId';
import type { WorldSection } from './WorldDelta';

const INPUT_TIMEOUT = 10_000; // 客人这么久没有任何消息视为断线
const RESUME_GRACE = 300_000; // 断线席位保留时长:期间用原房间码重新加入可恢复角色

/** 一名已接入的客人 */
type Guest = {
  peer: string;
  net: PeerNet;
  session: PlayerSession | null;
  name: string;
  lastSeen: number;
  resumeToken: string;
  lastInputSeq: number;
};

type Resumable = { session: PlayerSession; name: string; expires: number };

/** 房主侧联机会话总管:管理多条 DataChannel、接入/断线、输入写入、动作分发与快照广播 */
export class NetHost {
  terrainSeed: number;
  initialSave: SaveData | null = null;
  private guests: Guest[] = [];
  private game: Game | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private ticks = 0;
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

  /** 创建六位码房间；之后加入者由信令服务自动接入。 */
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
    if (this.guests.length >= 3) return;
    const net = new PeerNet('host', (data) => this.signal?.send(peer, data));
    const guest: Guest = {
      peer,
      net,
      session: null,
      name: '',
      lastSeen: performance.now(),
      resumeToken: crypto.randomUUID(),
      lastInputSeq: 0,
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
    if (!this.timer) this.timer = setInterval(() => this.tick(), 100);
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
      if (resume && resume.expires > performance.now()) {
        this.resumable.delete(msg.resumeToken!);
        guest.session = resume.session;
        guest.name = resume.name;
        guest.resumeToken = msg.resumeToken!;
      } else {
        if (this.guests.filter((item) => item !== guest && item.session).length + this.resumable.size >= 3) {
          guest.net.send({ t: 'reject', reason: '房间已满（断线玩家的席位会保留 5 分钟）' });
          setTimeout(() => this.dropGuest(guest), 100);
          return;
        }
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
    guest.session = this.game.claimSavedRemoteSession(guest.name) ?? this.game.addRemoteSession(false, undefined, guest.name);
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
      this.resumable.set(guest.resumeToken, {
        session: guest.session,
        name: guest.name,
        expires: performance.now() + RESUME_GRACE,
      });
    }
    guest.net.close();
    this.onGuestLeft(guest.name || '朋友');
  }

  /** 100ms 一拍:玩家/动物快照每拍,HUD 每 2 拍；世界状态由系统事件即时推送。 */
  private tick(): void {
    const game = this.game;
    if (!game) return;
    this.purgeResumable();
    this.ticks++;
    const now = performance.now();
    for (const guest of [...this.guests]) {
      if (now - guest.lastSeen > INPUT_TIMEOUT) {
        this.dropGuest(guest);
        continue;
      }
      if (!guest.net.connected || !guest.session) continue;
      guest.net.send(game.netPlayersMsg(guest.lastInputSeq));
      guest.net.send(game.netAnimalsMsg());
      guest.net.send(game.netAmbientMsg());
      if (this.ticks % 2 === 0) guest.net.send({ t: 'hud', snap: game.hudFor(guest.session) });
    }
  }

  private purgeResumable(): void {
    const now = performance.now();
    for (const [token, entry] of this.resumable) {
      if (entry.expires > now) continue;
      if (this.game) this.game.removeRemoteSession(entry.session);
      this.resumable.delete(token);
    }
  }
}
