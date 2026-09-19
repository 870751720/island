import type { ConnectionMode } from './ConnectionMode';

export function normalizeRoomCode(value: string): string {
  return value.replace(/[^0-9]/g, '').slice(0, 6);
}

export function roomConnectionMode(code: string): ConnectionMode | null {
  if (/^\d{6}$/.test(code)) return 'direct';
  if (/^\d{5}$/.test(code)) return 'relay';
  return null;
}
