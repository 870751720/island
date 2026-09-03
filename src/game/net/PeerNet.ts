import { NetTraffic, allocChannelId, dropRtt, updateRtt } from './NetTraffic';

/** 国内可直连的免费公共 STUN；游戏数据通过 DataChannel 直连。 */
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: ['stun:stun.qq.com:3478', 'stun:stun.miwifi.com:3478'] }],
};

/** 延迟探测间隔:对端收到 {t:'ping'} 原样回 pong,由发起方算往返耗时 */
const PING_INTERVAL = 1000;

export type PeerSignal =
  | { description: RTCSessionDescriptionInit }
  | { candidate: RTCIceCandidateInit };

/** 一条房主到客人的 WebRTC DataChannel。连接信息通过在线信令自动交换。 */
export class PeerNet {
  private readonly pc = new RTCPeerConnection(RTC_CONFIG);
  private channel?: RTCDataChannel;
  private readonly pendingCandidates: RTCIceCandidateInit[] = [];
  private queue: string[] = [];
  private closeNotified = false;
  private readonly channelId = allocChannelId();
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  onMessage: (msg: unknown) => void = () => {};
  onClose: () => void = () => {};
  onOpen: () => void = () => {};

  constructor(
    private readonly side: 'host' | 'guest',
    private readonly signal: (signal: PeerSignal) => void,
  ) {
    this.pc.onicecandidate = (event) => {
      if (event.candidate) this.signal({ candidate: event.candidate.toJSON() });
    };
    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState;
      if (state === 'failed' || state === 'disconnected' || state === 'closed') this.notifyClosed();
    };
    if (side === 'host') this.bindChannel(this.pc.createDataChannel('game'));
    else this.pc.ondatachannel = (event) => this.bindChannel(event.channel);
  }

  get connected(): boolean {
    return this.channel?.readyState === 'open';
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

  private bindChannel(channel: RTCDataChannel): void {
    this.channel = channel;
    channel.onopen = () => {
      for (const data of this.queue.splice(0)) channel.send(data);
      this.pingTimer = setInterval(() => this.send({ t: 'ping', ts: performance.now() }), PING_INTERVAL);
      this.onOpen();
    };
    channel.onmessage = (event) => {
      const data = event.data as string;
      NetTraffic.recvBytes += data.length;
      try {
        const msg = JSON.parse(data) as { t?: string; ts?: number };
        // 延迟探测在通道层拦截,不进入游戏消息处理
        if (msg.t === 'ping') this.send({ t: 'pong', ts: msg.ts });
        else if (msg.t === 'pong') updateRtt(this.channelId, Math.round(performance.now() - (msg.ts ?? 0)));
        else this.onMessage(msg);
      } catch {
        // 坏包忽略。
      }
    };
    channel.onclose = () => this.notifyClosed();
  }

  send(msg: unknown): void {
    const data = JSON.stringify(msg);
    NetTraffic.sentBytes += data.length;
    if (this.connected) this.channel!.send(data);
    else this.queue.push(data);
  }

  close(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    dropRtt(this.channelId);
    this.channel?.close();
    this.pc.close();
  }

  private notifyClosed(): void {
    if (this.closeNotified) return;
    this.closeNotified = true;
    this.onClose();
  }
}
