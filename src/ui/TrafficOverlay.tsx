'use client';

import { useEffect, useState } from 'react';
import { NetTraffic } from '@/game/net/NetTraffic';
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

  useEffect(() => {
    let sent = NetTraffic.sentBytes;
    let recv = NetTraffic.recvBytes;
    const timer = setInterval(() => {
      setUp(NetTraffic.sentBytes - sent);
      setDown(NetTraffic.recvBytes - recv);
      sent = NetTraffic.sentBytes;
      recv = NetTraffic.recvBytes;
      const values = [...NetTraffic.rtts.values()];
      setRtt(values.length > 0 ? Math.max(...values) : null);
      setOn(GmSystem.showTraffic);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!on) return null;
  return (
    <div style={overlayStyle}>
      ↑{fmt(up)} ↓{fmt(down)}
      {rtt !== null && <span style={{ marginLeft: 8, color: rtt < 100 ? '#7ee29a' : rtt < 250 ? '#f2d06b' : '#ef8a8a' }}>{rtt}ms</span>}
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
  padding: '3px 12px',
  borderRadius: 999,
  background: 'rgba(0,0,0,0.55)',
  fontFamily: 'monospace',
  fontSize: 13,
  fontWeight: 700,
  color: '#cbd5e1',
  pointerEvents: 'none',
} as const;
