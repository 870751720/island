import { relayUrl, type RelayStatus } from './ConnectionMode';
import { RelayPeer } from './RelayPeer';

const MAX_FRAME = 8 * 1024 * 1024;
const MAX_BUFFER = 16 * 1024 * 1024;
const encoder = new TextEncoder();

/** 房主复用一条 WebSocket，服务端按连接身份把每个客人的数据定向转发。 */
export class RelayRoom {
  code = '';
  capacity: RelayStatus | null = null;
  onPeer: (id: string, peer: RelayPeer) => void = () => {};
  onClosed: (reason: string) => void = () => {};
  private socket: WebSocket | null = null;
  private peers = new Map<string, RelayPeer>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private reject: ((error: Error) => void) | null = null;
  private closed = false;
  private lastSeen = 0;
  private side: 'host' | 'guest';

  constructor(side: 'host' | 'guest') { this.side = side; }

  guestPeer(): RelayPeer {
    return this.peer('host');
  }

  private peer(id: string): RelayPeer {
    const existing = this.peers.get(id);
    if (existing) return existing;
    const peer = new RelayPeer(
      data => this.send({ type: 'data', peer: id, data }),
      () => {
        this.peers.delete(id);
        if (this.closed) return;
        if (this.side === 'host') this.send({ type: 'drop', peer: id });
        else this.close();
      },
    );
    this.peers.set(id, peer);
    return peer;
  }

  connect(code?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.closed || this.socket) { reject(new Error('中转连接已取消')); return; }
      this.reject = reject;
      this.lastSeen = Date.now();
      let socket: WebSocket;
      try { socket = new WebSocket(relayUrl()); }
      catch { this.fail('中转服务暂不可用，请稍后重试或选择好友直连'); return; }
      this.socket = socket;
      this.timeout = setTimeout(() => this.fail('连接中转服务超时，请稍后重试或选择好友直连'), 10_000);
      socket.onopen = () => {
        if (this.closed) return;
        this.send(this.side === 'host' ? { type: 'create', version: 1 } : { type: 'join', version: 1, code });
        this.timer = setInterval(() => {
          if (Date.now() - this.lastSeen > 20_000) this.fail('中转连接超时，请重新加入房间');
          else this.send({ type: 'ping' });
        }, 5000);
      };
      socket.onmessage = event => {
        if (this.closed || typeof event.data !== 'string') return;
        this.lastSeen = Date.now();
        let msg: { type?: string; code?: string; peer?: string; data?: string } & RelayStatus;
        try { msg = JSON.parse(event.data); }
        catch { this.fail('中转消息异常，请重新加入'); return; }
        if (!msg || typeof msg !== 'object') { this.fail('中转消息异常，请重新加入'); return; }
        if (msg.type === 'ready' && !this.code && typeof msg.code === 'string') {
          this.code = msg.code;
          this.capacity = { rooms: msg.rooms, maxRooms: msg.maxRooms, maxPlayers: msg.maxPlayers };
          if (this.timeout) clearTimeout(this.timeout);
          this.timeout = null;
          this.reject = null;
          if (this.side === 'guest') this.guestPeer().open();
          resolve(this.code);
        } else if (msg.type === 'joined' && this.side === 'host' && typeof msg.peer === 'string') {
          if (this.peers.has(msg.peer)) return;
          const peer = this.peer(msg.peer);
          this.onPeer(msg.peer, peer);
          peer.open();
        } else if (msg.type === 'left' && typeof msg.peer === 'string') {
          this.peers.get(msg.peer)?.lost();
        } else if (msg.type === 'data' && typeof msg.data === 'string') {
          this.peers.get(this.side === 'host' ? msg.peer ?? '' : 'host')?.receive(msg.data);
        }
      };
      socket.onerror = () => this.fail('中转服务暂不可用，请稍后重试或选择好友直连');
      socket.onclose = event => this.fail(event.reason || '中转连接已断开，请重新加入房间');
    });
  }

  private send(message: unknown): boolean {
    const socket = this.socket;
    if (this.closed || socket?.readyState !== WebSocket.OPEN) return false;
    const data = JSON.stringify(message);
    const bytes = encoder.encode(data).byteLength;
    if (bytes > MAX_FRAME || socket.bufferedAmount + bytes > MAX_BUFFER) {
      this.fail(bytes > MAX_FRAME ? '岛屿数据超过中转限制，请使用好友直连' : '网络积压过多，请重新加入房间');
      return false;
    }
    try { socket.send(data); return true; }
    catch { this.fail('中转连接已断开，请重新加入房间'); return false; }
  }

  private fail(reason: string): void {
    if (this.closed) return;
    const connecting = !!this.reject;
    this.reject?.(new Error(reason));
    this.reject = null;
    // 静默释放虚拟连接，再统一通知所属会话，避免客人收到多个关闭回调。
    this.close();
    if (!connecting) this.onClosed(reason);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.reject?.(new Error('已取消中转连接'));
    this.reject = null;
    if (this.timer) clearInterval(this.timer);
    if (this.timeout) clearTimeout(this.timeout);
    this.timer = null;
    this.timeout = null;
    for (const peer of this.peers.values()) peer.close();
    this.peers.clear();
    if (this.socket) {
      this.socket.onopen = this.socket.onmessage = this.socket.onerror = this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
  }
}
