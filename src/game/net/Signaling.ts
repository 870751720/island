import { createUuid } from '@/platform/compat';
import type { MqttClient } from 'mqtt';
import type { PeerSignal } from './PeerNet';
import { BROKER_URLS, SIGNAL_TIMEOUT, connectSignalBroker, randomSignalId, subscribeSignalBroker } from './SignalBroker';

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

/** 同一房间在所有可用节点接待客人；每位客人的握手只沿原节点回复。 */
export class HostSignal {
  private readonly clients = new Set<MqttClient>();
  private readonly routes = new Map<string, MqttClient>();
  private readonly abort = new AbortController();
  private code = '';
  onPeerJoined: (peer: string) => void = () => {};
  onSignal: (peer: string, signal: PeerSignal) => void = () => {};
  onClose: () => void = () => {};

  static async create(): Promise<{ roomCode: string; signal: HostSignal }> {
    const signal = new HostSignal();
    signal.code = randomSignalId(5);
    // 第一个节点订阅成功即可开房，其他节点继续接入；所有失败才报错。
    try {
      await new Promise<void>((resolve, reject) => {
        let failed = 0;
        for (const url of BROKER_URLS) {
          void signal.listen(url).then(resolve, () => {
            if (++failed === BROKER_URLS.length) reject(new Error('无法连接联机服务，请稍后重试'));
          });
        }
      });
      return { roomCode: signal.code, signal };
    } catch (error) {
      signal.close();
      throw error;
    }
  }

  private async listen(url: string): Promise<void> {
    const client = await connectSignalBroker(url, 'host', this.abort.signal);
    if (this.abort.signal.aborted) { client.end(true); throw new Error('已取消连接'); }
    this.clients.add(client);
    const topic = uplinkTopic(this.code);
    client.on('message', (_topic, payload) => {
      if (!this.abort.signal.aborted) this.receive(client, parseMessage(payload));
    });
    try {
      await subscribeSignalBroker(client, topic, this.abort.signal);
      if (this.abort.signal.aborted) throw new Error('已取消连接');
      client.on('close', () => {
        if (!this.abort.signal.aborted && ![...this.clients].some((item) => item.connected)) this.onClose();
      });
      client.on('connect', () => {
        void subscribeSignalBroker(client, topic, this.abort.signal).catch(() => {});
      });
    } catch (error) {
      this.clients.delete(client);
      client.end(true);
      throw error;
    }
  }

  private receive(client: MqttClient, raw: unknown): void {
    if (!raw || typeof raw !== 'object') return;
    const message = raw as Partial<UplinkMessage>;
    if (message.type === 'join' && typeof message.peer === 'string') {
      const route = this.routes.get(message.peer);
      if (route && route !== client) return;
      this.routes.set(message.peer, client);
      publish(client, downlinkTopic(this.code, message.peer), { type: 'ready' } satisfies DownlinkMessage);
      this.onPeerJoined(message.peer);
    } else if (message.type === 'signal' && typeof message.peer === 'string' && message.data
      && this.routes.get(message.peer) === client) {
      this.onSignal(message.peer, message.data);
    }
  }

  send(peer: string, data: PeerSignal): void {
    publish(this.routes.get(peer) ?? null, downlinkTopic(this.code, peer), { type: 'signal', data } satisfies DownlinkMessage);
  }

  forget(peer: string): void {
    this.routes.delete(peer);
  }

  close(): void {
    this.abort.abort();
    for (const client of this.clients) client.end(true);
    this.clients.clear();
    this.routes.clear();
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
    let reachedBroker = false;
    for (const [index, url] of BROKER_URLS.entries()) {
      if (this.abort.signal.aborted) throw new Error('已取消连接');
      this.onStatus(`正在查找房间（线路 ${index + 1}/${BROKER_URLS.length}）…`);
      let client: MqttClient | null = null;
      try {
        client = await connectSignalBroker(url, 'guest', this.abort.signal);
        if (this.abort.signal.aborted) throw new Error('已取消连接');
        this.client = client;
        reachedBroker = true;
        // 每次查找使用独立身份，旧节点的迟到握手不会进入新尝试。
        this.peerId = `${createUuid()}-${randomSignalId(6)}`;
        await subscribeSignalBroker(client, downlinkTopic(code, this.peerId), this.abort.signal);
        await this.findHost(client);
        return;
      } catch (error) {
        if (this.client === client) this.client = null;
        client?.end(true);
        if (this.abort.signal.aborted) throw error;
      }
    }
    throw new Error(reachedBroker
      ? '未找到房间，请确认房间码、房主在线且双方可访问同一联机线路'
      : '无法连接联机服务，请检查网络后重试');
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
      const timer = setTimeout(() => finish(new Error('此线路未找到房间')), SIGNAL_TIMEOUT);
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
