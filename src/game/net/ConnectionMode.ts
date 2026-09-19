export type ConnectionMode = 'direct' | 'relay';
export const CONNECTION_LABELS: Record<ConnectionMode, string> = { direct: '好友直连', relay: '服务器中转' };
export function parseConnectionMode(value: unknown): ConnectionMode { return value === 'relay' ? 'relay' : 'direct'; }

export function relayUrl(): string {
  return process.env.NEXT_PUBLIC_RELAY_URL || 'wss://43.110.116.98/relay';
}

export type RelayStatus = { rooms: number; maxRooms: number; maxPlayers: number };
export async function fetchRelayStatus(signal: AbortSignal): Promise<RelayStatus> {
  const url = new URL(relayUrl());
  url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
  url.pathname += '/status';
  const response = await fetch(url, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('中转服务暂不可用');
  const value = await response.json() as RelayStatus;
  if (!Number.isInteger(value.rooms) || value.rooms < 0 || !Number.isInteger(value.maxRooms) || value.maxRooms < 1
    || !Number.isInteger(value.maxPlayers) || value.maxPlayers < 2) throw new Error('中转服务状态异常');
  return value;
}
