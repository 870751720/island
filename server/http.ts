import { createServer, type IncomingMessage } from 'node:http';
import { CLOUD_CODE_KEY, MAX_BYTES, normalizeCode, parseBundle } from '../shared/cloudSave.ts';
import type { SaveStore } from './store.ts';

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BYTES) throw new Error('oversize');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function createSaveServer(store: SaveStore, revision: string) {
  const limits = new Map<string, { until: number; count: number }>();
  return createServer({ requestTimeout: 30_000, headersTimeout: 10_000, maxHeaderSize: 8192 }, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Codes are explicit credentials, never ambient cookies. H5/file origins are supported.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    const reply = (status: number, data: unknown) => { res.writeHead(status); res.end(JSON.stringify(data)); };
    if (req.url === '/api/health' && req.method === 'GET') { reply(200, { ok: true, revision }); return; }
    if (req.url !== '/api/save') { reply(404, { error: 'not_found' }); return; }
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (req.method !== 'GET' && req.method !== 'PUT') { reply(405, { error: 'method' }); return; }
    const now = Date.now();
    for (const [key, entry] of limits) if (entry.until <= now) limits.delete(key);
    // The API port is private; nginx overwrites this header with the actual client IP.
    const address = String(req.headers['x-real-ip'] ?? req.socket.remoteAddress ?? 'unknown');
    if (!limits.has(address) && limits.size >= 10_000) { reply(429, { error: 'busy' }); return; }
    const rate = limits.get(address) ?? { until: now + 60_000, count: 0 };
    limits.set(address, rate);
    if (++rate.count > 30) { res.setHeader('Retry-After', '60'); reply(429, { error: 'rate' }); return; }
    let code: string;
    try {
      const header = req.headers.authorization;
      if (!header?.startsWith('SaveCode ')) throw new Error('missing');
      code = normalizeCode(decodeURIComponent(header.slice(9)));
    } catch { reply(401, { error: 'code' }); return; }
    try {
      if (req.method === 'GET') {
        const body = store.get(code);
        if (body === undefined) { reply(404, { error: 'missing' }); return; }
        res.writeHead(200); res.end(body); return;
      }
      if (!req.headers['content-type']?.startsWith('application/json')) { reply(415, { error: 'content_type' }); return; }
      if (Number(req.headers['content-length']) > MAX_BYTES) { reply(413, { error: 'size' }); return; }
      let text: string;
      try {
        text = await readBody(req);
        const bundle = parseBundle(text);
        if (bundle.entries[CLOUD_CODE_KEY] !== code) throw new Error('code_mismatch');
      } catch (error) { reply(error instanceof Error && error.message === 'oversize' ? 413 : 400, { error: 'invalid_bundle' }); return; }
      store.put(code, text);
      reply(200, { ok: true });
    } catch { reply(503, { error: 'storage_unavailable' }); }
  });
}
