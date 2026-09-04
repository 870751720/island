const utf8Encoder = new TextEncoder();

export type TrafficChannel = 'control' | 'state';
export type TrafficDirection = 'up' | 'down';
export type TrafficBreakdown = { direction: TrafficDirection; channel: TrafficChannel; type: string; bytes: number };

/**
 * 网络流量统计:由 PeerNet 在收发统一入口累加字节数,并汇总各条通道的往返延迟。
 * GM 流量浮层按秒采样差值得到每秒上下行速率;单机时无数据,恒为 0。
 */
export const NetTraffic = {
  sentBytes: 0,
  recvBytes: 0,
  breakdown: new Map<string, TrafficBreakdown>(),
  /** JSON 的 UTF-8 字节数（不含 SCTP/DTLS 开销）。 */
  byteLength(value: string): number {
    return utf8Encoder.encode(value).byteLength;
  },
  record(direction: TrafficDirection, channel: TrafficChannel, type: string, bytes: number): void {
    const key = `${direction}:${channel}:${type}`;
    const current = this.breakdown.get(key);
    if (current) current.bytes += bytes;
    else this.breakdown.set(key, { direction, channel, type: type || 'unknown', bytes });
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
