import { decodeCode, encodeCode } from './RoomCode';

/** 免费公共 STUN,帮助两端穿透 NAT 打洞;打不通直连时即失败(首版不部署 TURN) */
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

/** 一条 WebRTC DataChannel 直连:
 * 房主侧先用 createInvite 生成邀请码,等朋友回传码后 acceptAnswer 完成握手;
 * 客人侧 joinWithInvite 粘贴邀请码、返回回传码。消息为 JSON 文本。 */
export class PeerNet {
  private pc: RTCPeerConnection;
  private channel?: RTCDataChannel;
  onMessage: (msg: unknown) => void = () => {};
  onClose: () => void = () => {};

  constructor() {
    this.pc = new RTCPeerConnection(RTC_CONFIG);
    this.pc.onconnectionstatechange = () => {
      const s = this.pc.connectionState;
      if (s === 'failed' || s === 'disconnected' || s === 'closed') this.onClose();
    };
  }

  get connected(): boolean {
    return this.channel?.readyState === 'open';
  }

  /** 房主:生成邀请码(SDP offer,等 ICE 候选收集完成或超时) */
  async createInvite(): Promise<string> {
    this.bindChannel(this.pc.createDataChannel('game'));
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this.waitIce();
    return encodeCode({ role: 'invite', sdp: this.pc.localDescription!.sdp });
  }

  /** 客人:粘贴邀请码,返回回传码(SDP answer)发给房主 */
  async joinWithInvite(code: string): Promise<string> {
    this.pc.ondatachannel = (e) => this.bindChannel(e.channel);
    await this.pc.setRemoteDescription({ type: 'offer', sdp: decodeCode(code).sdp });
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await this.waitIce();
    return encodeCode({ role: 'answer', sdp: this.pc.localDescription!.sdp });
  }

  /** 房主:粘贴客人的回传码,完成握手 */
  async acceptAnswer(code: string): Promise<void> {
    await this.pc.setRemoteDescription({ type: 'answer', sdp: decodeCode(code).sdp });
  }

  private bindChannel(dc: RTCDataChannel): void {
    this.channel = dc;
    dc.onmessage = (e) => {
      try {
        this.onMessage(JSON.parse(e.data as string));
      } catch {
        // 坏包忽略
      }
    };
    dc.onclose = () => this.onClose();
  }

  /** 等 ICE 候选收集完成(部分网络收不满,4 秒超时用已有候选连线) */
  private waitIce(): Promise<void> {
    if (this.pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(done, 4000);
      this.pc.addEventListener('icegatheringstatechange', () => {
        if (this.pc.iceGatheringState === 'complete') done();
      });
    });
  }

  send(msg: unknown): void {
    if (this.connected) this.channel!.send(JSON.stringify(msg));
  }

  close(): void {
    this.channel?.close();
    this.pc.close();
  }
}
