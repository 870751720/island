const utf8Encoder = new TextEncoder();

/**
 * 网络流量统计:由 PeerNet 在收发统一入口累加字节数,并汇总各条通道的往返延迟。
 * GM 流量浮层按秒采样差值得到每秒上下行速率;单机时无数据,恒为 0。
 */
export const NetTraffic = {
  sentBytes: 0,
  recvBytes: 0,
  /** JSON 的 UTF-8 字节数（不含 SCTP/DTLS 开销）。 */
  byteLength(value: string): number {
    return utf8Encoder.encode(value).byteLength;
  },
  /** 各 DataChannel 最近一次 ping 往返延迟(毫秒),按通道 id 记录,断线时移除 */
  rtts: new Map<number, number>(),
};

let nextChannelId = 1;

export function allocChannelId(): number {
  return nextChannelId++;
}

export function updateRtt(id: number, ms: number): void {
  NetTraffic.rtts.set(id, ms);
}

export function dropRtt(id: number): void {
  NetTraffic.rtts.delete(id);
}
