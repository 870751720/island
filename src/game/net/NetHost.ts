import type { Game } from '../Game';
import type { PlayerSession } from '../mp/PlayerSession';
import { PeerNet } from './PeerNet';
import { ACTIONS } from './Actions';
import type { NetMsg } from './Protocol';

const INPUT_TIMEOUT = 10_000; // 客人这么久没有任何消息视为断线

/** 一名已接入的客人 */
type Guest = {
  net: PeerNet;
  session: PlayerSession | null;
  name: string;
  lastSeen: number;
};

/** 房主侧联机会话总管:管理多条 DataChannel、接入/断线、输入写入、动作分发与快照广播 */
export class NetHost {
  readonly terrainSeed: number;
  readonly propsSeed: number;
  private guests: Guest[] = [];
  private game: Game | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private ticks = 0;
  private lastWorldJson = '';

  onGuestJoined: (name: string) => void = () => {};
  onGuestLeft: (name: string) => void = () => {};

  constructor() {
    this.terrainSeed = Math.random() * 1000;
    this.propsSeed = Math.floor(Math.random() * 0xffffffff);
  }

  /** 已接入的客人名字(含未开始的) */
  get guestNames(): string[] {
    return this.guests.filter((g) => g.net.connected || g.session).map((g) => g.name || '朋友');
  }

  /** 为下一个朋友生成邀请码 */
  async createInvite(): Promise<string> {
    const net = new PeerNet();
    const guest: Guest = { net, session: null, name: '', lastSeen: performance.now() };
    this.guests.push(guest);
    net.onMessage = (msg) => this.onMessage(guest, msg as NetMsg);
    net.onClose = () => this.dropGuest(guest);
    return net.createInvite();
  }

  /** 粘贴客人的回传码,完成该连接的握手 */
  async acceptAnswer(code: string): Promise<void> {
    const guest = this.guests.find((g) => !g.net.connected && !g.session);
    if (!guest) throw new Error('请先生成新的邀请码');
    await guest.net.acceptAnswer(code);
  }

  /** 游戏创建后挂接:为已连客人建会话并发欢迎包,开始按帧广播 */
  attach(game: Game): void {
    this.game = game;
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
  }

  private onMessage(guest: Guest, msg: NetMsg): void {
    guest.lastSeen = performance.now();
    if (msg.t === 'hello') {
      guest.name = msg.name?.trim() || '朋友';
      if (this.game && !guest.session) this.welcome(guest);
      this.onGuestJoined(guest.name);
    } else if (msg.t === 'input' && guest.session) {
      guest.session.player.input.setJoystick(msg.x, msg.z);
    } else if (msg.t === 'action' && guest.session && this.game) {
      ACTIONS[msg.name]?.(this.game, guest.session, msg.args);
    }
  }

  private welcome(guest: Guest): void {
    if (!this.game || guest.session) return;
    guest.session = this.game.addRemoteSession();
    guest.net.send({
      t: 'welcome',
      seeds: { terrainSeed: this.terrainSeed, propsSeed: this.propsSeed },
      state: this.game.collectSave(),
      you: this.game.sessionIndexOf(guest.session),
    });
    guest.net.send({ t: 'start' });
  }

  private dropGuest(guest: Guest): void {
    const index = this.guests.indexOf(guest);
    if (index < 0) return;
    this.guests.splice(index, 1);
    if (guest.session && this.game) this.game.removeRemoteSession(guest.session);
    guest.net.close();
    this.onGuestLeft(guest.name || '朋友');
  }

  /** 100ms 一拍:玩家/动物快照每拍,HUD 每 2 拍,世界状态每 10 拍且仅在变化时 */
  private tick(): void {
    const game = this.game;
    if (!game) return;
    this.ticks++;
    const now = performance.now();
    for (const guest of [...this.guests]) {
      if (now - guest.lastSeen > INPUT_TIMEOUT) {
        this.dropGuest(guest);
        continue;
      }
      if (!guest.net.connected || !guest.session) continue;
      guest.net.send(game.netPlayersMsg());
      guest.net.send(game.netAnimalsMsg());
      if (this.ticks % 2 === 0) guest.net.send({ t: 'hud', snap: game.hudFor(guest.session) });
      if (this.ticks % 10 === 0) this.maybeSendWorld(guest);
    }
  }

  private maybeSendWorld(guest: Guest): void {
    const game = this.game!;
    const state = game.collectSave();
    // 昼夜时刻单独随玩家快照走,不参与脏比较
    const json = JSON.stringify({ ...state, dayTime: 0, day: 0 });
    if (json === this.lastWorldJson) return;
    this.lastWorldJson = json;
    guest.net.send({ t: 'world', state });
  }
}
