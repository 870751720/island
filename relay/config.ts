export type RelayConfig = {
  maxRooms: number;
  maxPlayers: number;
  maxPayload: number;
  maxBuffered: number;
  idleMs: number;
  registrationMs: number;
};

function limit(env: Record<string, string | undefined>, key: string, fallback: number, min: number, max: number): number {
  if (!env[key]) return fallback;
  const value = Number(env[key]);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid ${key}`);
  return value;
}

export function relayConfig(env: Record<string, string | undefined> = process.env): RelayConfig {
  return {
    maxRooms: limit(env, 'RELAY_MAX_ROOMS', 2, 1, 100),
    maxPlayers: limit(env, 'RELAY_MAX_PLAYERS', 4, 2, 32),
    maxPayload: 8 * 1024 * 1024,
    maxBuffered: 16 * 1024 * 1024,
    idleMs: 45_000,
    registrationMs: 10_000,
  };
}
