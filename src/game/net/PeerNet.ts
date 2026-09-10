import { NetTraffic, allocChannelId, dropRtt, updateRtt } from './NetTraffic';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: ['stun:stun.qq.com:3478', 'stun:stun.miwifi.com:3478'] }],
};

const PING_INTERVAL = 1000;
const CONTROL_LABEL = 'game-control';
const STATE_LABEL = 'game-state';
const STATE_HIGH_WATER = 128 * 1024;
const STATE_LOW_WATER = 32 * 1024;
const CONTROL_HIGH_WATER = 512 * 1024;
const CONTROL_LOW_WATER = 128 * 1024;
const STATE_TYPES = new Set(['input']);
// 单条 DataChannel 消息超过浏览器安全上限(约 256KB)会发送失败,大存档等消息按 UTF-16 单元分片;
// 每单元最多 3 字节 UTF-8,20000 单元 ≤ 60KB,远离上限。
const FRAG_UNITS = 20_000;
const FRAG_TYPE = '__frag';
type FragFrame = { t: typeof FRAG_TYPE; f: number; i: number; n: number; d: string };

export type PeerSignal =
  | { description: RTCSessionDescriptionInit }
  | { candidate: RTCIceCandidateInit };

/** 关键消息走可靠有序通道；可淘汰的实时状态走无序、不重传通道。 */
export class PeerNet {
  private readonly pc = new RTCPeerConnection(RTC_CONFIG);
  private controlChannel?: RTCDataChannel;
  private stateChannel?: RTCDataChannel;
  private readonly pendingCandidates: RTCIceCandidateInit[] = [];
  private readonly controlQueue: string[] = [];
  private readonly latestState = new Map<string, string>();
  private nextFragId = 1;
  private fragRecvId = 0;
  private fragRecvParts: string[] | null = null;
  private fragRecvBytes = 0;
  private closeNotified = false;
  private openNotified = false;
  private readonly channelId = allocChannelId();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;

  onMessage: (msg: unknown) => void = () => {};
  onClose: () => void = () => {};
  onOpen: () => void = () => {};

  constructor(
    private readonly side: 'host' | 'guest',
    private readonly signal: (signal: PeerSignal) => void,
  ) {
    // 房主和客人都回收无法完成握手的连接，包括仍停留在 checking 的情况。
    this.connectTimer = setTimeout(() => this.notifyClosed(), 30_000);
    this.pc.onicecandidate = (event) => {
      if (event.candidate) this.signal({ candidate: event.candidate.toJSON() });
    };
    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState;
      if (state === 'failed' || state === 'disconnected' || state === 'closed') this.notifyClosed();
    };
    if (side === 'host') {
      this.bindControlChannel(this.pc.createDataChannel(CONTROL_LABEL));
      this.bindStateChannel(this.pc.createDataChannel(STATE_LABEL, { ordered: false, maxRetransmits: 0 }));
    } else {
      this.pc.ondatachannel = (event) => {
        if (event.channel.label === CONTROL_LABEL) this.bindControlChannel(event.channel);
        else if (event.channel.label === STATE_LABEL) this.bindStateChannel(event.channel);
        else event.channel.close();
      };
    }
  }

  get connected(): boolean {
    return this.controlChannel?.readyState === 'open' && this.stateChannel?.readyState === 'open';
  }

  async start(): Promise<void> {
    if (this.side !== 'host') return;
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.signal({ description: offer });
  }

  async receiveSignal(signal: PeerSignal): Promise<void> {
    if ('description' in signal) {
      await this.pc.setRemoteDescription(signal.description);
      await this.flushCandidates();
      if (signal.description.type === 'offer') {
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.signal({ description: answer });
      }
      return;
    }
    if (!this.pc.remoteDescription) this.pendingCandidates.push(signal.candidate);
    else await this.pc.addIceCandidate(signal.candidate);
  }

  private async flushCandidates(): Promise<void> {
    for (const candidate of this.pendingCandidates.splice(0)) await this.pc.addIceCandidate(candidate);
  }

  private bindControlChannel(channel: RTCDataChannel): void {
    this.controlChannel = channel;
    channel.bufferedAmountLowThreshold = CONTROL_LOW_WATER;
    channel.onopen = () => { this.flushControl(); this.notifyOpenIfReady(); };
    channel.onbufferedamountlow = () => this.flushControl();
    channel.onmessage = (event) => this.receive(event.data, 'control');
    channel.onclose = () => this.notifyClosed();
  }

  private bindStateChannel(channel: RTCDataChannel): void {
    this.stateChannel = channel;
    channel.bufferedAmountLowThreshold = STATE_LOW_WATER;
    channel.onopen = () => { this.flushLatestState(); this.notifyOpenIfReady(); };
    channel.onbufferedamountlow = () => this.flushLatestState();
    channel.onmessage = (event) => this.receive(event.data, 'state');
    channel.onclose = () => this.notifyClosed();
  }

  private notifyOpenIfReady(): void {
    if (!this.connected || this.openNotified) return;
    this.openNotified = true;
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.flushControl();
    this.flushLatestState();
    this.pingTimer = setInterval(() => this.send({ t: 'ping', ts: performance.now() }), PING_INTERVAL);
    this.onOpen();
  }

  private receive(raw: unknown, channel: 'control' | 'state'): void {
    if (typeof raw !== 'string') return;
    NetTraffic.recvBytes += NetTraffic.byteLength(raw);
    try {
      const msg = JSON.parse(raw) as { t?: string };
      if (msg.t === FRAG_TYPE) this.collectFrag(msg as FragFrame, channel);
      else this.dispatch(msg, channel, NetTraffic.byteLength(raw));
    } catch { /* 坏包忽略。 */ }
  }

  private dispatch(msg: { t?: string; ts?: number }, channel: 'control' | 'state', bytes: number): void {
    NetTraffic.record('down', channel, typeof msg.t === 'string' ? msg.t : 'unknown', bytes);
    if (msg.t === 'ping') this.send({ t: 'pong', ts: msg.ts });
    else if (msg.t === 'pong') updateRtt(this.channelId, Math.round(performance.now() - (msg.ts ?? 0)));
    else this.onMessage(msg);
  }

  /** 分片按发送顺序到达(可靠有序通道),同一时刻只保留一组未完成的分片。 */
  private collectFrag(frame: FragFrame, channel: 'control' | 'state'): void {
    const { f, i, n, d } = frame;
    if (f !== this.fragRecvId) {
      this.fragRecvId = f;
      this.fragRecvParts = new Array<string>(n).fill('');
      this.fragRecvBytes = 0;
    }
    const parts = this.fragRecvParts;
    if (!parts || i >= parts.length || parts[i]) return;
    parts[i] = d;
    this.fragRecvBytes += NetTraffic.byteLength(JSON.stringify(frame));
    if (parts.some((part) => !part)) return;
    try {
      this.dispatch(JSON.parse(parts.join('')) as { t?: string }, channel, this.fragRecvBytes);
    } catch { /* 坏包忽略。 */ }
    this.fragRecvParts = null;
  }

  send(msg: unknown): void {
    const type = this.messageType(msg);
    const data = JSON.stringify(msg);
    if (STATE_TYPES.has(type)) this.sendState(type, data);
    else this.sendControl(data);
  }

  private messageType(msg: unknown): string {
    if (!msg || typeof msg !== 'object' || !('t' in msg)) return '';
    const type = (msg as { t?: unknown }).t;
    return typeof type === 'string' ? type : '';
  }

  private sendControl(data: string): void {
    const frames = this.fragment(data);
    if (frames.length > 1) {
      for (const frame of frames) this.controlQueue.push(frame);
      this.flushControl();
      return;
    }
    const channel = this.controlChannel;
    if (!channel || channel.readyState !== 'open' || this.controlQueue.length > 0 || channel.bufferedAmount >= CONTROL_HIGH_WATER) {
      this.controlQueue.push(data);
      this.flushControl();
      return;
    }
    if (!this.sendNow(channel, data)) this.controlQueue.push(data);
  }

  /** 超大消息按 UTF-16 单元切成多帧;收缩边界避免拆开代理对。 */
  private fragment(data: string): string[] {
    if (NetTraffic.byteLength(data) <= FRAG_UNITS * 3) return [data];
    const chunks: string[] = [];
    let start = 0;
    while (start < data.length) {
      let end = Math.min(start + FRAG_UNITS, data.length);
      if (end < data.length) {
        const prev = data.charCodeAt(end - 1);
        if (prev >= 0xd800 && prev <= 0xdbff) end--;
      }
      chunks.push(data.slice(start, end));
      start = end;
    }
    const f = this.nextFragId++;
    return chunks.map((d, i) => JSON.stringify({ t: FRAG_TYPE, f, i, n: chunks.length, d }));
  }

  private flushControl(): void {
    const channel = this.controlChannel;
    if (!channel || channel.readyState !== 'open') return;
    while (this.controlQueue.length && channel.bufferedAmount < CONTROL_HIGH_WATER) {
      const data = this.controlQueue.shift()!;
      if (!this.sendNow(channel, data)) { this.controlQueue.unshift(data); return; }
    }
  }

  private sendState(type: string, data: string): void {
    const channel = this.stateChannel;
    if (!channel || channel.readyState !== 'open' || channel.bufferedAmount >= STATE_HIGH_WATER) {
      this.latestState.set(type, data);
      return;
    }
    // 若应用层还留有同类旧状态，新状态直接取代它，避免稍后倒序补发。
    this.latestState.delete(type);
    if (!this.sendNow(channel, data)) this.latestState.set(type, data);
  }

  private flushLatestState(): void {
    const channel = this.stateChannel;
    if (!channel || channel.readyState !== 'open') return;
    for (const [type, data] of this.latestState) {
      if (channel.bufferedAmount >= STATE_HIGH_WATER) return;
      if (!this.sendNow(channel, data)) return;
      this.latestState.delete(type);
    }
  }

  private sendNow(channel: RTCDataChannel, data: string): boolean {
    try {
      channel.send(data);
      const bytes = NetTraffic.byteLength(data);
      NetTraffic.sentBytes += bytes;
      const type = /"t":"([^"]+)"/.exec(data)?.[1] ?? 'unknown';
      NetTraffic.record('up', channel === this.stateChannel ? 'state' : 'control', type, bytes);
      return true;
    } catch { return false; }
  }

  close(): void {
    this.closeNotified = true;
    if (this.connectTimer) clearTimeout(this.connectTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    dropRtt(this.channelId);
    this.controlChannel?.close();
    this.stateChannel?.close();
    this.pc.close();
  }

  private notifyClosed(): void {
    if (this.closeNotified) return;
    this.closeNotified = true;
    if (this.connectTimer) clearTimeout(this.connectTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    dropRtt(this.channelId);
    this.onClose();
  }
}
