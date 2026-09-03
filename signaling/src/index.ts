import { DurableObject } from 'cloudflare:workers';

interface Env {
  ROOMS: DurableObjectNamespace<Room>;
}

type Attachment = { role: 'host' | 'guest'; peer: string };
type SignalMessage = { type: 'signal'; target?: string; data: unknown };

const ROOM_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const ROOM_TTL_MS = 12 * 60 * 60 * 1000;

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'content-type',
    },
  });
}

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => ROOM_ALPHABET[byte % ROOM_ALPHABET.length]).join('');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'content-type',
        },
      });
    }
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/rooms') {
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = randomCode();
        const token = crypto.randomUUID();
        const room = env.ROOMS.getByName(code);
        const result = await room.fetch('https://room/create', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });
        if (result.ok) return json({ code, token });
      }
      return json({ error: 'room unavailable' }, 503);
    }

    const match = url.pathname.match(/^\/rooms\/([A-Z0-9]{6})\/ws$/);
    if (!match) return json({ error: 'not found' }, 404);
    return env.ROOMS.getByName(match[1]).fetch(request);
  },
} satisfies ExportedHandler<Env>;

export class Room extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/create' && request.method === 'POST') {
      const existing = await this.ctx.storage.get<number>('createdAt');
      if (existing && Date.now() - existing < ROOM_TTL_MS) return new Response(null, { status: 409 });
      const { token } = (await request.json()) as { token: string };
      await this.ctx.storage.put({ token, createdAt: Date.now() });
      await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
      return new Response(null, { status: 201 });
    }

    if (request.headers.get('Upgrade') !== 'websocket') return new Response('upgrade required', { status: 426 });
    const token = await this.ctx.storage.get<string>('token');
    if (!token) return new Response('room not found', { status: 404 });

    const role = url.searchParams.get('role');
    const peer = url.searchParams.get('peer') ?? '';
    if (role !== 'host' && role !== 'guest') return new Response('bad role', { status: 400 });
    if (role === 'host' && url.searchParams.get('token') !== token) return new Response('forbidden', { status: 403 });
    if (role === 'guest' && !/^[0-9a-f-]{36}$/.test(peer)) return new Response('bad peer', { status: 400 });
    if (role === 'guest' && this.guests().length >= 3) return new Response('room full', { status: 409 });

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const attachment: Attachment = { role, peer: role === 'host' ? 'host' : peer };
    server.serializeAttachment(attachment);
    this.ctx.acceptWebSocket(server);

    if (role === 'host') {
      for (const guest of this.guests()) {
        const guestState = guest.deserializeAttachment() as Attachment;
        server.send(JSON.stringify({ type: 'peer-joined', peer: guestState.peer }));
      }
    } else {
      this.host()?.send(JSON.stringify({ type: 'peer-joined', peer }));
    }
    server.send(JSON.stringify({ type: 'ready' }));
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer): void {
    if (typeof raw !== 'string' || raw.length > 64_000) return socket.close(1009, 'message too large');
    let message: SignalMessage;
    try {
      message = JSON.parse(raw) as SignalMessage;
    } catch {
      return;
    }
    if (message.type !== 'signal' || !message.data) return;
    const sender = socket.deserializeAttachment() as Attachment;
    if (sender.role === 'guest') {
      this.host()?.send(JSON.stringify({ type: 'signal', from: sender.peer, data: message.data }));
      return;
    }
    const target = this.guests().find((candidate) => {
      const state = candidate.deserializeAttachment() as Attachment;
      return state.peer === message.target;
    });
    target?.send(JSON.stringify({ type: 'signal', from: 'host', data: message.data }));
  }

  webSocketClose(socket: WebSocket, code: number, reason: string): void {
    const sender = socket.deserializeAttachment() as Attachment;
    if (sender.role === 'guest') {
      this.host()?.send(JSON.stringify({ type: 'peer-left', peer: sender.peer }));
    } else {
      for (const guest of this.guests()) guest.close(4000, 'host left');
    }
    socket.close(code, reason);
  }

  async alarm(): Promise<void> {
    for (const socket of this.ctx.getWebSockets()) socket.close(4001, 'room expired');
    await this.ctx.storage.deleteAll();
  }

  private host(): WebSocket | undefined {
    return this.ctx.getWebSockets().find((socket) => (socket.deserializeAttachment() as Attachment).role === 'host');
  }

  private guests(): WebSocket[] {
    return this.ctx.getWebSockets().filter((socket) => (socket.deserializeAttachment() as Attachment).role === 'guest');
  }
}
