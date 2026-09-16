type TraceData = Record<string, unknown>;
const records: Array<{ ms: number; event: string; data: TraceData }> = [];
let state: TraceData = {};

export function buffTraceEnabled(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.hash.slice(1)).get('buff-debug') === '1';
}

export function traceBuff(event: string, data: TraceData = {}): void {
  if (!buffTraceEnabled()) return;
  records.push({ ms: Math.round(performance.now()), event, data });
  if (records.length > 400) records.shift();
}

export function traceBuffState(next: TraceData): void {
  state = next;
  traceBuff('react-state', next);
}

export function describeElement(target: EventTarget | null): string {
  if (!(target instanceof Element)) return String(target);
  return [target.tagName.toLowerCase(), target.id ? `#${target.id}` : '',
    target.getAttribute('class') ?? '', target.getAttribute('data-buff-id') ?? ''].filter(Boolean).join(' ');
}

export function buffTraceReport(): string {
  return JSON.stringify({ version: 1, userAgent: navigator.userAgent,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    state, records }, null, 2);
}
