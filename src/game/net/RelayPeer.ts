import type { GameConnection } from './GameConnection';
import { NetTraffic, allocChannelId, dropRtt, updateRtt } from './NetTraffic';

/** 一条逻辑房主/客人链路；中转消息保持有序，不淘汰增量快照。 */
export class RelayPeer implements GameConnection {
  connected = false;
  onMessage: (msg: unknown) => void = () => {};
  onClose: () => void = () => {};
  onOpen: () => void = () => {};
  private readonly channelId = allocChannelId();
  private timer: ReturnType<typeof setInterval> | null = null;
  private ended = false;
  private transmit: (data: string) => boolean;
  private disconnect: () => void;

  constructor(transmit: (data: string) => boolean, disconnect: () => void) {
    this.transmit = transmit;
    this.disconnect = disconnect;
  }

  open(): void {
    if (this.ended || this.connected) return;
    this.connected = true;
    this.timer = setInterval(() => this.send({ t: 'ping', ts: performance.now() }), 1000);
    this.onOpen();
  }

  receive(data: string): void {
    if (!this.connected) return;
    let msg: { t?: string; ts?: number };
    try { msg = JSON.parse(data); } catch { this.lost(); return; }
    if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') { this.lost(); return; }
    const bytes = NetTraffic.byteLength(data);
    NetTraffic.recvBytes += bytes;
    NetTraffic.record('down', 'control', msg.t, bytes);
    if (msg.t === 'ping') this.send({ t: 'pong', ts: msg.ts });
    else if (msg.t === 'pong') {
      if (typeof msg.ts === 'number') updateRtt(this.channelId, Math.max(0, Math.round(performance.now() - msg.ts)));
    } else {
      try { this.onMessage(msg); } catch { this.lost(); }
    }
  }

  send(msg: unknown): void {
    if (!this.connected) return;
    const data = JSON.stringify(msg);
    if (!this.transmit(data)) return;
    const bytes = NetTraffic.byteLength(data);
    NetTraffic.sentBytes += bytes;
    NetTraffic.record('up', 'control', (msg as { t?: string }).t ?? 'unknown', bytes);
  }

  close(): void {
    if (this.ended) return;
    this.ended = true;
    this.connected = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    dropRtt(this.channelId);
    this.disconnect();
  }

  lost(): void {
    if (this.ended) return;
    this.close();
    this.onClose();
  }
}
