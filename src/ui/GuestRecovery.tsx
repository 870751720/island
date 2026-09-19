'use client';

import { useEffect, useState } from 'react';
import { NetGuest, loadLastRoom } from '@/game/net/NetGuest';
import { loadProfile } from '@/game/playerProfile';

/** 重建客人游戏前先取得完整欢迎包，避免旧世界、动作回执和库存混入恢复后的会话。 */
export function GuestRecovery({ onRecovered, onCancel }: {
  onRecovered: (guest: NetGuest) => void;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState('连接中断，正在恢复房间…');
  useEffect(() => {
    const room = loadLastRoom();
    if (!room) { onCancel(); return; }
    let stopped = false;
    let candidate: NetGuest | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const attempt = () => {
      if (stopped || candidate || document.hidden) return;
      if (++attempts > 3) { onCancel(); return; }
      const guest = new NetGuest();
      candidate = guest;
      const failed = () => {
        if (stopped || candidate !== guest) return;
        clearTimeout(timeout);
        candidate = null;
        guest.dispose();
        setStatus('暂时没有连上房主，正在重试…');
        retry = setTimeout(attempt, 2000);
      };
      guest.onClosed = failed;
      guest.onRejected = () => { failed(); stopped = true; onCancel(); };
      guest.onStarted = () => {
        if (stopped || candidate !== guest || !guest.welcome) return;
        clearTimeout(timeout);
        stopped = true;
        candidate = null;
        onRecovered(guest);
      };
      timeout = setTimeout(failed, 35_000);
      void guest.join(room.code, room.name, loadProfile()?.gender).catch(failed);
    };
    const visible = () => { if (!document.hidden) { clearTimeout(retry); attempt(); } };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('online', visible);
    attempt();
    return () => {
      stopped = true;
      clearTimeout(retry);
      clearTimeout(timeout);
      candidate?.dispose();
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('online', visible);
    };
  }, [onRecovered, onCancel]);
  return <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24, background: '#e9e4d6', color: '#354536' }}>
    <p role="status">{status}</p>
    <button style={{ minHeight: 48, padding: '12px 24px' }} onClick={onCancel}>返回加入房间</button>
  </div>;
}
