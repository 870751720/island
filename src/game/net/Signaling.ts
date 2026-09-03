import mqtt, { type MqttClient } from 'mqtt';
import type { PeerSignal } from './PeerNet';

const BROKER_URL = 'wss://broker-cn.emqx.io:8084/mqtt';
const TOPIC_PREFIX = 'island-game/v1';
const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CONNECT_TIMEOUT = 10_000;

type UplinkMessage =
  | { type: 'join'; peer: string }
  | { type: 'signal'; peer: string; data: PeerSignal };

type DownlinkMessage = { type: 'ready' } | { type: 'signal'; data: PeerSignal };

function randomId(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => ROOM_CHARS[byte % ROOM_CHARS.length]).join('');
}

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

/** 连接国内公共 MQTT；它只传递 WebRTC 握手信息，不承载游戏数据。 */
function connectBroker(role: 'host' | 'guest', reconnectPeriod = 0): Promise<MqttClient> {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(BROKER_URL, {
      clean: true,
      clientId: `island_${role}_${randomId(12)}`,
      connectTimeout: CONNECT_TIMEOUT,
      keepalive: 30,
      reconnectPeriod,
      protocolVersion: 4,
    });
    const timer = window.setTimeout(() => {
      client.end(true);
      reject(new Error('连接国内联机服务超时'));
    }, CONNECT_TIMEOUT);
    client.once('connect', () => {
      window.clearTimeout(timer);
      resolve(client);
    });
    client.once('error', (error) => {
      window.clearTimeout(timer);
      client.end(true);
      reject(new Error(`无法连接国内联机服务：${error.message}`));
    });
  });
}

function subscribe(client: MqttClient, topic: string): Promise<void> {
  return new Promise((resolve, reject) => {
    client.subscribe(topic, { qos: 0 }, (error) => {
      if (error) reject(new Error('订阅房间失败'));
      else resolve();
    });
  });
}

function publish(client: MqttClient | null, topic: string, message: unknown): void {
  if (!client?.connected) return;
  client.publish(topic, JSON.stringify(message), { qos: 0, retain: false });
}

export class HostSignal {
  private client: MqttClient | null = null;
  private code = '';
  onPeerJoined: (peer: string) => void = () => {};
  onSignal: (peer: string, signal: PeerSignal) => void = () => {};
  onClose: () => void = () => {};

  static async create(): Promise<{ roomCode: string; signal: HostSignal }> {
    const signal = new HostSignal();
    signal.code = randomId(6);
    signal.client = await connectBroker('host', 5000);
    await subscribe(signal.client, uplinkTopic(signal.code));
    signal.client.on('message', (_topic, payload) => signal.receive(parseMessage(payload)));
    signal.client.once('close', () => signal.onClose());
    // 游戏全程保持信令在线供断线客人重连:公共 broker 可能掐掉空闲连接,
    // 断开后自动重连并重新订阅房间主题
    signal.client.on('connect', () => {
      void subscribe(signal.client!, uplinkTopic(signal.code)).catch(() => {});
    });
    signal.client.on('error', () => {});
    return { roomCode: signal.code, signal };
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
    this.client?.end(true);
    this.client = null;
  }
}

export class GuestSignal {
  private client: MqttClient | null = null;
  private code = '';
  readonly peer = `${crypto.randomUUID()}-${randomId(6)}`;
  onSignal: (signal: PeerSignal) => void = () => {};
  onClose: () => void = () => {};

  async connect(code: string): Promise<void> {
    this.code = code;
    this.client = await connectBroker('guest');
    await subscribe(this.client, downlinkTopic(code, this.peer));
    let markReady: (() => void) | null = null;
    const ready = new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('房间不存在或房主已离开')), CONNECT_TIMEOUT);
      markReady = () => {
        window.clearTimeout(timer);
        resolve();
      };
    });
    this.client.on('message', (_topic, payload) => {
      const raw = parseMessage(payload);
      if (!raw || typeof raw !== 'object') return;
      const message = raw as { type?: string; data?: PeerSignal };
      if (message.type === 'ready') markReady?.();
      else if (message.type === 'signal' && message.data) this.onSignal(message.data);
    });
    this.client.once('close', () => this.onClose());
    publish(this.client, uplinkTopic(code), { type: 'join', peer: this.peer } satisfies UplinkMessage);
    try {
      await ready;
    } catch (error) {
      this.close();
      throw error;
    }
  }

  send(data: PeerSignal): void {
    publish(this.client, uplinkTopic(this.code), { type: 'signal', peer: this.peer, data } satisfies UplinkMessage);
  }

  close(): void {
    this.client?.end(true);
    this.client = null;
  }
}

export function normalizeRoomCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}
