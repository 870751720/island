/** 免费公共 STUN；信令仅负责交换连接信息，游戏数据仍通过 DataChannel 直连。 */
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

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
      this.onOpen();
    };
    channel.onmessage = (event) => {
      try {
        this.onMessage(JSON.parse(event.data as string));
      } catch {
        // 坏包忽略。
      }
    };
    channel.onclose = () => this.notifyClosed();
  }

  send(msg: unknown): void {
    const data = JSON.stringify(msg);
    if (this.connected) this.channel!.send(data);
    else this.queue.push(data);
  }

  close(): void {
    this.channel?.close();
    this.pc.close();
  }

  private notifyClosed(): void {
    if (this.closeNotified) return;
    this.closeNotified = true;
    this.onClose();
  }
}
