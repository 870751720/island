/** 发布验收只检查状态与 WebSocket 心跳，不占用玩家房间名额。 */
export async function verifyRelay(site = 'https://43.110.116.98', revision?: string): Promise<void> {
  const response = await fetch(`${site}/relay/status`, { signal: AbortSignal.timeout(8000) });
  const status = await response.json() as { ok?: boolean; revision?: string; maxRooms?: number; maxPlayers?: number };
  if (!response.ok || !status.ok || (revision && status.revision !== revision)
    || !Number.isInteger(status.maxRooms) || !Number.isInteger(status.maxPlayers)) throw new Error('Relay health check failed');
  await new Promise<void>((resolve, reject) => {
    const url = new URL('/relay', site);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(url);
    const timeout = setTimeout(() => finish(new Error('Relay WebSocket timed out')), 8000);
    let done = false;
    function finish(error?: Error) {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
      socket.close();
      if (error) reject(error); else resolve();
    }
    socket.onopen = () => socket.send(JSON.stringify({ type: 'ping' }));
    socket.onmessage = event => {
      try { if (JSON.parse(String(event.data)).type === 'pong') finish(); }
      catch { finish(new Error('Invalid relay response')); }
    };
    socket.onerror = socket.onclose = () => finish(new Error('Relay WebSocket failed'));
  });
}
