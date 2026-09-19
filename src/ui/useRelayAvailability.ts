import { useEffect, useState } from 'react';
import { fetchRelayStatus, type ConnectionMode, type RelayStatus } from '@/game/net/ConnectionMode';

export function useRelayAvailability(mode: ConnectionMode, active = true) {
  const [status, setStatus] = useState<RelayStatus | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    setStatus(null);
    setError('');
    if (mode !== 'relay' || !active) { setLoading(false); return; }
    let disposed = false;
    let request: AbortController | null = null;
    const refresh = async () => {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      const timeout = setTimeout(() => controller.abort(), 6000);
      setLoading(true);
      try {
        const next = await fetchRelayStatus(controller.signal);
        if (!disposed) { setStatus(next); setError(''); }
      } catch {
        if (!disposed) { setStatus(null); setError('暂时无法获取中转名额，可重试或选择好友直连'); }
      } finally {
        clearTimeout(timeout);
        if (!disposed) setLoading(false);
      }
    };
    void refresh();
    const interval = setInterval(() => { void refresh(); }, 15_000);
    return () => { disposed = true; request?.abort(); clearInterval(interval); };
  }, [mode, active, revision]);
  return { status, error, loading, full: !!status && status.rooms >= status.maxRooms, refresh: () => setRevision(value => value + 1) };
}
