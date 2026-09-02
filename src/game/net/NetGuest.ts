import { PeerNet } from './PeerNet';
import { NET_PROTOCOL_VERSION, type NetMsg, type AnimalPose, type AmbientState, type NetEvent, type WorldPatch } from './Protocol';
import type { SaveData } from '../systems/SaveSystem';
import type { HudSnapshot } from '../Game';

const INPUT_HZ = 20; // 摇杆上行频率
const RESUME_KEY = 'island.multiplayer.resume';

/** 客人侧联机会话:单条 DataChannel,上行摇杆/动作,下行世界与快照交给 Game 的 guest 模式应用 */
export class NetGuest {
  private net = new PeerNet();
  private inputX = 0;
  private inputZ = 0;
  private inputTimer: ReturnType<typeof setInterval> | null = null;
  private lastInputSent = 0;
  private disposed = false;
  /** 房主发来的欢迎包(种子 + 全量初始状态 + 稳定玩家标识),开始游戏时交给 Game */
  welcome: { seeds: { terrainSeed: number; propsSeed: number }; state: SaveData; roster: string[]; you: string } | null =
    null;

  onStarted: () => void = () => {};
  onClosed: () => void = () => {};
  onRejected: (reason: string) => void = () => {};
  /** 由 Game(guest 模式)注册的数据应用回调 */
  onPlayers: (msg: Extract<NetMsg, { t: 'players' }>) => void = () => {};
  onAnimals: (list: AnimalPose[]) => void = () => {};
  onAmbient: (state: AmbientState) => void = () => {};
  onWorld: (state: WorldPatch) => void = () => {};
  onHud: (snap: HudSnapshot) => void = () => {};
  onEvent: (event: NetEvent) => void = () => {};

  /** 粘贴房主的邀请码,返回回传码发给房主 */
  async join(code: string, name: string): Promise<string> {
    this.net.onMessage = (raw) => this.onMessage(raw as NetMsg);
    this.net.onClose = () => {
      this.stopInput();
      if (!this.disposed) this.onClosed();
    };
    const answer = await this.net.joinWithInvite(code);
    let resumeToken: string | undefined;
    try {
      resumeToken = localStorage.getItem(RESUME_KEY) || undefined;
    } catch {}
    this.net.send({ t: 'hello', name, protocol: NET_PROTOCOL_VERSION, resumeToken });
    return answer;
  }

  /** 收到 start 后由 Game 调用:开始按频率上行摇杆并应用下行数据 */
  begin(): void {
    this.startInput();
  }

  dispose(): void {
    this.disposed = true;
    this.stopInput();
    this.net.close();
  }

  private onMessage(msg: NetMsg): void {
    switch (msg.t) {
      case 'welcome':
        if (msg.protocol !== NET_PROTOCOL_VERSION) {
          this.onRejected('双方游戏版本不一致，请刷新页面后重试');
          this.dispose();
          break;
        }
        this.welcome = { seeds: msg.seeds, state: msg.state, roster: msg.roster, you: msg.you };
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
        this.onPlayers(msg);
        break;
      case 'animals':
        this.onAnimals(msg.list);
        break;
      case 'ambient':
        this.onAmbient(msg.state);
        break;
      case 'world':
        this.onWorld(msg.patch);
        break;
      case 'hud':
        this.onHud(msg.snap);
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
      this.net.send({ t: 'input', x: this.inputX, z: this.inputZ });
    }, 1000 / INPUT_HZ / 2);
  }

  private stopInput(): void {
    if (this.inputTimer) clearInterval(this.inputTimer);
    this.inputTimer = null;
  }

  /** 把一次按钮动作发给房主权威结算(返回值仅表示已发出) */
  action(name: string, args: unknown[]): boolean {
    this.net.send({ t: 'action', name, args });
    return true;
  }
}
