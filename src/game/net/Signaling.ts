import { createUuid } from '@/platform/compat';
import type { MqttClient } from 'mqtt';
import type { PeerSignal } from './PeerNet';
import { SIGNAL_TIMEOUT, connectSignalBroker, randomSignalId, subscribeSignalBroker } from './SignalBroker';

const TOPIC_PREFIX = 'island-game/v1';

type UplinkMessage =
  | { type: 'join'; peer: string }
  | { type: 'signal'; peer: string; data: PeerSignal };
type DownlinkMessage = { type: 'ready' } | { type: 'signal'; data: PeerSignal };

function uplinkTopic(code: string): string {
  return `${TOPIC_PREFIX}/${code}/up`;
}

function downlinkTopic(code: string, peer: string): string {
  return `${TOPIC_PREFIX}/${code}/down/${peer}`;
}

function parseMessage(payload: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(payload));
  } catch {
    return null;
  }
}

function publish(client: MqttClient | null, topic: string, message: unknown): void {
  if (!client?.connected) return;
  client.publish(topic, JSON.stringify(message), { qos: 0, retain: false });
}

/** 房主与客人固定使用同一信令服务交换握手信息。 */
export class HostSignal {
  private client: MqttClient | null = null;
  private readonly abort = new AbortController();
  private code = '';
  onPeerJoined: (peer: string) => void = () => {};
  onSignal: (peer: string, signal: PeerSignal) => void = () => {};
  onClose: () => void = () => {};

  static async create(): Promise<{ roomCode: string; signal: HostSignal }> {
    const signal = new HostSignal();
    signal.code = randomSignalId(5);
    try {
      await signal.listen();
      return { roomCode: signal.code, signal };
    } catch (error) {
      signal.close();
      throw error;
    }
  }

  private async listen(): Promise<void> {
    const client = await connectSignalBroker('host', this.abort.signal);
    if (this.abort.signal.aborted) { client.end(true); throw new Error('已取消连接'); }
    this.client = client;
    const topic = uplinkTopic(this.code);
    client.on('message', (_topic, payload) => {
      if (!this.abort.signal.aborted) this.receive(parseMessage(payload));
    });
    try {
      await subscribeSignalBroker(client, topic, this.abort.signal);
      if (this.abort.signal.aborted) throw new Error('已取消连接');
      client.on('close', () => {
        if (!this.abort.signal.aborted) this.onClose();
      });
      client.on('connect', () => {
        void subscribeSignalBroker(client, topic, this.abort.signal).catch(() => {});
      });
    } catch (error) {
      this.client = null;
      client.end(true);
      throw error;
    }
  }

  private receive(raw: unknown): void {
    if (!raw || typeof raw !== 'object') return;
    const message = raw as Partial<UplinkMessage>;
    if (message.type === 'join' && typeof message.peer === 'string') {
      publish(this.client, downlinkTopic(this.code, message.peer), { type: 'ready' } satisfies DownlinkMessage);
      this.onPeerJoined(message.peer);
    } else if (message.type === 'signal' && typeof message.peer === 'string' && message.data) {
      this.onSignal(message.peer, message.data);
    }
  }

  send(peer: string, data: PeerSignal): void {
    publish(this.client, downlinkTopic(this.code, peer), { type: 'signal', data } satisfies DownlinkMessage);
  }

  close(): void {
    this.abort.abort();
    this.client?.end(true);
    this.client = null;
  }
}

export class GuestSignal {
  private client: MqttClient | null = null;
  private readonly abort = new AbortController();
  private code = '';
  private peerId = '';
  private selected = false;
  onSignal: (signal: PeerSignal) => void = () => {};
  onReady: () => void = () => {};
  onStatus: (status: string) => void = () => {};
  onClose: () => void = () => {};

  async connect(code: string): Promise<void> {
    this.code = code;
    if (this.abort.signal.aborted) throw new Error('已取消连接');
    this.onStatus('正在连接联机服务…');
    let client: MqttClient | null = null;
    try {
      client = await connectSignalBroker('guest', this.abort.signal);
      if (this.abort.signal.aborted) throw new Error('已取消连接');
      this.client = client;
      this.peerId = `${createUuid()}-${randomSignalId(6)}`;
      this.onStatus('正在查找房间…');
      await subscribeSignalBroker(client, downlinkTopic(code, this.peerId), this.abort.signal);
      await this.findHost(client);
    } catch (error) {
      this.client = null;
      client?.end(true);
      if (this.abort.signal.aborted) throw new Error('已取消连接');
      if (!client) throw new Error('无法连接联机服务，请检查网络后重试');
      throw error;
    }
  }

  private findHost(client: MqttClient): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.abort.signal.removeEventListener('abort', cancelled);
        client.removeListener('close', disconnected);
        client.removeListener('error', failed);
        if (error) {
          client.removeListener('message', messageReceived);
          reject(error);
        } else resolve();
      };
      const cancelled = () => finish(new Error('已取消连接'));
      const disconnected = () => finish(new Error('联机服务连接中断'));
      const failed = (error: Error) => finish(error);
      const timer = setTimeout(() => finish(new Error('未找到房间，请确认房间码和房主在线')), SIGNAL_TIMEOUT);
      const messageReceived = (_topic: string, payload: Uint8Array) => {
        if (this.client !== client || this.abort.signal.aborted) return;
        const raw = parseMessage(payload);
        if (!raw || typeof raw !== 'object') return;
        const message = raw as Partial<DownlinkMessage>;
        if (message.type === 'ready' && !settled) {
          this.selected = true;
          finish();
          client.once('close', () => {
            if (this.client === client && !this.abort.signal.aborted) this.onClose();
          });
          this.onReady();
        } else if (message.type === 'signal' && message.data && this.selected) {
          this.onSignal(message.data);
        }
      };
      this.abort.signal.addEventListener('abort', cancelled, { once: true });
      client.on('close', disconnected);
      client.on('error', failed);
      client.on('message', messageReceived);
      if (this.abort.signal.aborted) cancelled();
      else if (!client.connected) disconnected();
      else publish(client, uplinkTopic(this.code), { type: 'join', peer: this.peerId } satisfies UplinkMessage);
    });
  }

  send(data: PeerSignal): void {
    if (!this.selected) return;
    publish(this.client, uplinkTopic(this.code), { type: 'signal', peer: this.peerId, data } satisfies UplinkMessage);
  }

  close(): void {
    this.abort.abort();
    this.client?.end(true);
    this.client = null;
  }
}

export function normalizeRoomCode(value: string): string {
  return value.replace(/[^0-9]/g, '').slice(0, 5);
}
