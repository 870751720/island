'use client';

import { useEffect, useState } from 'react';
import { NetTraffic, type TrafficBreakdown } from '@/game/net/NetTraffic';
import { GmSystem } from '@/game/systems/GmSystem';

/**
 * 网络流量浮层:GM 面板开启后显示在屏幕顶部(帧率浮层下方)。
 * 每秒采样 NetTraffic 字节差值得到上下行速率,延迟取各通道 RTT 最大值。
 */
export function TrafficOverlay() {
  const [on, setOn] = useState(GmSystem.showTraffic);
  const [up, setUp] = useState(0);
  const [down, setDown] = useState(0);
  const [rtt, setRtt] = useState<number | null>(null);
  const [details, setDetails] = useState<TrafficBreakdown[]>([]);

  useEffect(() => {
    let sent = NetTraffic.sentBytes;
    let recv = NetTraffic.recvBytes;
    const detailBytes = new Map([...NetTraffic.breakdown].map(([key, item]) => [key, item.bytes]));
    const timer = setInterval(() => {
      setUp(NetTraffic.sentBytes - sent);
      setDown(NetTraffic.recvBytes - recv);
      sent = NetTraffic.sentBytes;
      recv = NetTraffic.recvBytes;
      const next: TrafficBreakdown[] = [];
      for (const [key, item] of NetTraffic.breakdown) {
        const bytes = item.bytes - (detailBytes.get(key) ?? 0);
        detailBytes.set(key, item.bytes);
        if (bytes > 0) next.push({ ...item, bytes });
      }
      setDetails(next.sort((a, b) => b.bytes - a.bytes).slice(0, 8));
      const values = [...NetTraffic.rtts.values()];
      setRtt(values.length > 0 ? Math.max(...values) : null);
      setOn(GmSystem.showTraffic);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!on) return null;
  return (
    <div style={overlayStyle}>
      <div style={summaryStyle}>
        ↑{fmt(up)} ↓{fmt(down)}
        {rtt !== null && <span style={{ marginLeft: 8, color: rtt < 100 ? '#7ee29a' : rtt < 250 ? '#f2d06b' : '#ef8a8a' }}>{rtt}ms</span>}
      </div>
      <div style={detailStyle}>
        {details.map((item) => (
          <div key={`${item.direction}:${item.channel}:${item.type}`} style={rowStyle}>
            <span>{item.direction === 'up' ? '↑' : '↓'} {LABELS[item.type] ?? item.type}</span>
            <span style={{ color: item.channel === 'state' ? '#8dd8ff' : '#ffd98d' }}>
              {fmt(item.bytes)} · {item.channel === 'state' ? '实时' : '可靠'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmt(bytesPerSec: number): string {
  return bytesPerSec >= 1024 ? `${(bytesPerSec / 1024).toFixed(1)}KB/s` : `${bytesPerSec}B/s`;
}

const overlayStyle = {
  position: 'absolute',
  top: 34,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 30,
  width: 'min(330px, calc(100vw - 24px))',
  padding: '5px 10px 7px',
  borderRadius: 10,
  background: 'rgba(0,0,0,0.55)',
  fontFamily: 'monospace',
  fontSize: 13,
  fontWeight: 700,
  color: '#cbd5e1',
  pointerEvents: 'none',
} as const;

const summaryStyle = { textAlign: 'center' } as const;
const detailStyle = { marginTop: 4, borderTop: '1px solid rgba(255,255,255,.16)', paddingTop: 3 } as const;
const rowStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10, lineHeight: 1.35 } as const;

const LABELS: Record<string, string> = {
  input: '输入', players: '玩家姿态', animals: '动物', ambient: '环境生物',
  hud: 'HUD', worldDelta: '世界增量', worldFull: '世界全量', worldResync: '重同步请求',
  event: '事件', heartbeat: '心跳', ping: 'Ping', pong: 'Pong', welcome: '欢迎包', start: '开始',
};
