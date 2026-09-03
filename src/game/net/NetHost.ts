import type { Game } from '../Game';
import type { PlayerSession } from '../mp/PlayerSession';
import type { SaveData } from '../systems/SaveSystem';
import { PeerNet } from './PeerNet';
import { HostSignal } from './Signaling';
import { ACTIONS } from './Actions';
import { NET_PROTOCOL_VERSION, type NetEvent, type NetMsg, type WorldPatch } from './Protocol';

const INPUT_TIMEOUT = 10_000; // 客人这么久没有任何消息视为断线
const RESUME_GRACE = 60_000;

/** 一名已接入的客人 */
type Guest = {
  peer: string;
  net: PeerNet;
  session: PlayerSession | null;
  name: string;
  lastSeen: number;
  resumeToken: string;
};

type Resumable = { session: PlayerSession; name: string; expires: number };

/** 房主侧联机会话总管:管理多条 DataChannel、接入/断线、输入写入、动作分发与快照广播 */
export class NetHost {
  terrainSeed: number;
  propsSeed: number;
  initialSave: SaveData | null = null;
  private guests: Guest[] = [];
  private game: Game | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private ticks = 0;
  private worldHashes = new Map<keyof WorldPatch, string>();
  private resumable = new Map<string, Resumable>();
  private signal: HostSignal | null = null;
  roomCode = '';

  onGuestJoined: (name: string) => void = () => {};
  onGuestLeft: (name: string) => void = () => {};

  constructor() {
    this.terrainSeed = Math.random() * 1000;
    this.propsSeed = Math.floor(Math.random() * 0xffffffff);
  }

  useSavedWorld(save: SaveData | null): void {
    this.initialSave = save;
    if (save) {
      this.terrainSeed = save.terrainSeed;
      this.propsSeed = save.propsSeed;
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
    // 已加入玩家的 DataChannel 均已建立，正式游戏不再依赖信令服务。
    this.signal?.close();
    this.signal = null;
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
          guest.net.send({ t: 'reject', reason: '房间已满（断线玩家的席位会保留 1 分钟）' });
          setTimeout(() => this.dropGuest(guest), 100);
          return;
        }
        guest.name = msg.name?.trim().slice(0, 16) || '朋友';
      }
      if (this.game && !guest.session) this.welcome(guest);
      else if (this.game) this.sendWelcome(guest);
      this.onGuestJoined(guest.name);
    } else if (msg.t === 'input' && guest.session) {
      const x = Number.isFinite(msg.x) ? Math.max(-1, Math.min(1, msg.x)) : 0;
      const z = Number.isFinite(msg.z) ? Math.max(-1, Math.min(1, msg.z)) : 0;
      guest.session.player.input.setJoystick(x, z);
    } else if (msg.t === 'action' && guest.session && this.game) {
      if (typeof msg.name !== 'string' || !Array.isArray(msg.args) || msg.args.length > 8) return;
      const game = this.game;
      const session = guest.session;
      game.runNetAction(session, () => ACTIONS[msg.name]?.(game, session, msg.args));
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
      seeds: { terrainSeed: this.terrainSeed, propsSeed: this.propsSeed },
      state: this.game.collectSave(true),
      roster: this.game.sessionIds(),
      you: guest.session.id,
      protocol: NET_PROTOCOL_VERSION,
      resumeToken: guest.resumeToken,
    });
    guest.net.send({ t: 'start' });
  }

  broadcastEvent(event: NetEvent): void {
    for (const guest of this.guests) {
      if (guest.net.connected && guest.session) guest.net.send({ t: 'event', event });
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

  /** 100ms 一拍:玩家/动物快照每拍,HUD 每 2 拍,世界状态每 10 拍且仅在变化时 */
  private tick(): void {
    const game = this.game;
    if (!game) return;
    this.purgeResumable();
    this.ticks++;
    const now = performance.now();
    const active: Guest[] = [];
    for (const guest of [...this.guests]) {
      if (now - guest.lastSeen > INPUT_TIMEOUT) {
        this.dropGuest(guest);
        continue;
      }
      if (!guest.net.connected || !guest.session) continue;
      active.push(guest);
      guest.net.send(game.netPlayersMsg());
      guest.net.send(game.netAnimalsMsg());
      guest.net.send(game.netAmbientMsg());
      if (this.ticks % 2 === 0) guest.net.send({ t: 'hud', snap: game.hudFor(guest.session) });
    }
    if (this.ticks % 10 === 0) this.maybeBroadcastWorld(active);
  }

  private maybeBroadcastWorld(guests: Guest[]): void {
    const game = this.game!;
    const save = game.collectSave(true);
    const sections: WorldPatch = {
      props: save.props,
      campfires: save.campfires,
      workbenches: save.workbenches,
      workbenchCrafted: save.workbenchCrafted,
      crates: save.crates,
      fences: save.fences,
      fenceGates: save.fenceGates,
      beds: save.beds,
      drops: save.drops,
    };
    const patch: WorldPatch = {};
    for (const key of Object.keys(sections) as (keyof WorldPatch)[]) {
      const value = sections[key];
      const json = JSON.stringify(value);
      if (this.worldHashes.get(key) === json) continue;
      this.worldHashes.set(key, json);
      Object.assign(patch, { [key]: value });
    }
    // 围栏柱和门由同一个场景系统重建，任一变化时必须成对下发。
    if (patch.fences !== undefined || patch.fenceGates !== undefined) {
      patch.fences = save.fences;
      patch.fenceGates = save.fenceGates;
    }
    if (Object.keys(patch).length === 0) return;
    for (const guest of guests) guest.net.send({ t: 'world', patch });
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
