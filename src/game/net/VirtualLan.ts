/** Optional, tab-local setting: virtual addresses can change between UU rooms. */
let address = '';
export const getVirtualLanAddress = () => address;
export function validVirtualLanAddress(value: string): boolean {
  const parts = value.split('.');
  return parts.length === 4 && parts.every(part => /^(0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255)
    && Number(parts[0]) > 0 && Number(parts[0]) < 224 && Number(parts[0]) !== 127
    && !(parts[0] === '169' && parts[1] === '254');
}
export function setVirtualLanAddress(value: string): void {
  address = validVirtualLanAddress(value.trim()) ? value.trim() : '';
}

/** Advertise an additional endpoint; never mutate the browser's original candidate. */
export function virtualLanCandidate(candidate: RTCIceCandidateInit, ip: string): RTCIceCandidateInit | null {
  if (!validVirtualLanAddress(ip) || !candidate.candidate) return null;
  const fields = candidate.candidate.trim().split(/\s+/);
  if (fields.length < 8 || fields[2].toLowerCase() !== 'udp' || fields[6] !== 'typ' || fields[7] !== 'host'
    || fields[4] === ip || !/^\d+$/.test(fields[5]) || Number(fields[5]) < 1 || Number(fields[5]) > 65535) return null;
  fields[0] += '-vlan';
  fields[3] = '1'; // Original candidates retain preference.
  fields[4] = ip;
  return { ...candidate, candidate: fields.join(' ') };
}

let entries: string[] = [];
const listeners = new Set<() => void>();
export const getDirectDiagnostics = () => entries;
export const subscribeDirectDiagnostics = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export function directDiagnostic(peer: number, message: string): void {
  entries = [...entries.slice(-39), `连接 ${peer} · ${message}`];
  listeners.forEach(listener => listener());
}
