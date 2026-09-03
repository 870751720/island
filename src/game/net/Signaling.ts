import type { PeerSignal } from './PeerNet';

const SIGNAL_URL =
  process.env.NEXT_PUBLIC_SIGNAL_URL ?? 'https://island-signal.island-870751720.workers.dev';

type ServerMessage =
  | { type: 'ready' }
  | { type: 'peer-joined'; peer: string }
  | { type: 'peer-left'; peer: string }
  | { type: 'signal'; from: string; data: PeerSignal }
  | { type: 'error'; message: string };

function endpoint(path: string): string {
  if (!SIGNAL_URL) throw new Error('联机服务尚未配置');
  return `${SIGNAL_URL.replace(/\/$/, '')}${path}`;
}

function socketUrl(path: string): string {
  return endpoint(path).replace(/^http/, 'ws');
}

class SignalSocket {
  private socket: WebSocket | null = null;
  private opened = false;
  private queue: string[] = [];

  onMessage: (message: ServerMessage) => void = () => {};
  onClose: () => void = () => {};

  async connect(path: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(socketUrl(path));
      this.socket = socket;
      const timer = window.setTimeout(() => reject(new Error('连接房间超时')), 10_000);
      socket.onopen = () => {
        window.clearTimeout(timer);
        this.opened = true;
        for (const data of this.queue.splice(0)) socket.send(data);
        resolve();
      };
      socket.onerror = () => {
        window.clearTimeout(timer);
        if (!this.opened) reject(new Error('无法连接联机服务'));
      };
      socket.onclose = () => this.onClose();
      socket.onmessage = (event) => {
        try {
          this.onMessage(JSON.parse(event.data as string) as ServerMessage);
        } catch {
          // 无效信令忽略。
        }
      };
    });
  }

  send(message: unknown): void {
    const data = JSON.stringify(message);
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(data);
    else this.queue.push(data);
  }

  close(): void {
    this.socket?.close(1000, 'leave');
    this.socket = null;
  }
}

export class HostSignal {
  private readonly socket = new SignalSocket();
  onPeerJoined: (peer: string) => void = () => {};
  onPeerLeft: (peer: string) => void = () => {};
  onSignal: (peer: string, signal: PeerSignal) => void = () => {};
  onClose: () => void = () => {};

  static async create(): Promise<{ roomCode: string; signal: HostSignal }> {
    const response = await fetch(endpoint('/rooms'), { method: 'POST' });
    if (!response.ok) throw new Error('创建房间失败');
    const room = (await response.json()) as { code: string; token: string };
    const signal = new HostSignal();
    await signal.connect(room.code, room.token);
    return { roomCode: room.code, signal };
  }

  private async connect(code: string, token: string): Promise<void> {
    this.socket.onMessage = (message) => {
      if (message.type === 'peer-joined') this.onPeerJoined(message.peer);
      else if (message.type === 'peer-left') this.onPeerLeft(message.peer);
      else if (message.type === 'signal') this.onSignal(message.from, message.data);
    };
    this.socket.onClose = () => this.onClose();
    await this.socket.connect(`/rooms/${code}/ws?role=host&token=${encodeURIComponent(token)}`);
  }

  send(peer: string, data: PeerSignal): void {
    this.socket.send({ type: 'signal', target: peer, data });
  }

  close(): void {
    this.socket.close();
  }
}

export class GuestSignal {
  private readonly socket = new SignalSocket();
  readonly peer = crypto.randomUUID();
  onSignal: (signal: PeerSignal) => void = () => {};
  onClose: () => void = () => {};

  async connect(code: string): Promise<void> {
    this.socket.onMessage = (message) => {
      if (message.type === 'signal') this.onSignal(message.data);
      else if (message.type === 'error') this.onClose();
    };
    this.socket.onClose = () => this.onClose();
    await this.socket.connect(`/rooms/${code}/ws?role=guest&peer=${encodeURIComponent(this.peer)}`);
  }

  send(data: PeerSignal): void {
    this.socket.send({ type: 'signal', data });
  }

  close(): void {
    this.socket.close();
  }
}

export function normalizeRoomCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}
