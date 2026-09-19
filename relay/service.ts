import { createServer } from 'node:http';
import { randomInt, randomUUID } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { relayConfig, type RelayConfig } from './config.ts';

type Member = { socket: WebSocket; room?: Room; peer?: string; seen: number; created: number; closed: boolean };
type Room = { code: string; host: Member; guests: Map<string, Member> };

/** 只验证路由与容量，游戏载荷视为不透明字符串，永远由房主处理。 */
export function createRelayService(config: RelayConfig = relayConfig(), revision = process.env.REVISION ?? 'local') {
  const rooms = new Map<string, Room>();
  const members = new Set<Member>();
  const status = () => ({ rooms: rooms.size, maxRooms: config.maxRooms, maxPlayers: config.maxPlayers });
  const server = createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET' && req.url === '/relay/status') {
      res.end(JSON.stringify({ ok: true, revision, ...status() }));
    } else { res.writeHead(404); res.end('{}'); }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: config.maxPayload, perMessageDeflate: false });

  function remove(member: Member): void {
    if (member.closed) return;
    member.closed = true;
    members.delete(member);
    const room = member.room;
    if (!room) return;
    member.room = undefined;
    if (room.host === member) {
      rooms.delete(room.code);
      for (const guest of [...room.guests.values()]) end(guest, '房主已离开，中转房间已关闭');
    } else if (member.peer && room.guests.delete(member.peer)) {
      send(room.host, { type: 'left', peer: member.peer });
    }
  }

  function end(member: Member, reason: string): void {
    if (member.closed) return;
    remove(member);
    // close reason 为短 UTF-8 文本，客户端无须解析游戏消息即可显示故障。
    member.socket.close(4000, reason);
    const timer = setTimeout(() => member.socket.terminate(), 1000);
    timer.unref();
    member.socket.once('close', () => clearTimeout(timer));
  }

  function send(member: Member, message: unknown): boolean {
    if (member.closed || member.socket.readyState !== WebSocket.OPEN) return false;
    const data = JSON.stringify(message);
    if (member.socket.bufferedAmount + Buffer.byteLength(data) > config.maxBuffered) {
      end(member, '网络积压过多，请重新加入房间');
      return false;
    }
    member.socket.send(data, error => { if (error) end(member, '中转连接中断，请重新加入'); });
    return true;
  }

  server.on('upgrade', (req, socket, head) => {
    // 限制未登记连接；房间和玩家名额仍在下方同步、原子地检查。
    if (req.url !== '/relay' || members.size >= config.maxRooms * config.maxPlayers + 16) {
      socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');
      return;
    }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
  });
  wss.on('connection', socket => {
    const member: Member = { socket, seen: Date.now(), created: Date.now(), closed: false };
    members.add(member);
    socket.on('error', () => remove(member));
    socket.on('close', () => remove(member));
    socket.on('message', (raw, binary) => {
      if (member.closed) return;
      let msg: Record<string, unknown>;
      try {
        const value: unknown = binary ? null : JSON.parse(raw.toString());
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
        msg = value as Record<string, unknown>;
      } catch { end(member, '无效的中转消息'); return; }
      member.seen = Date.now();
      if (msg.type === 'ping') { send(member, { type: 'pong' }); return; }
      if (!member.room) {
        if (msg.version !== 1) { end(member, '中转版本不一致，请刷新游戏'); return; }
        if (msg.type === 'create') {
          if (rooms.size >= config.maxRooms) { end(member, '中转房间已满，请稍后重试或选择好友直连'); return; }
          let code: string;
          do { code = String(randomInt(10000, 100000)); } while (rooms.has(code));
          const room: Room = { code, host: member, guests: new Map() };
          rooms.set(code, room);
          member.room = room;
          send(member, { type: 'ready', code, ...status() });
        } else if (msg.type === 'join' && typeof msg.code === 'string') {
          const room = rooms.get(msg.code);
          if (!room) { end(member, '中转房间不存在，请确认连接方式、房间码和房主在线'); return; }
          if (room.guests.size + 1 >= config.maxPlayers) { end(member, '该房间人数已满，请等空位后重试'); return; }
          member.room = room;
          member.peer = randomUUID();
          room.guests.set(member.peer, member);
          if (!send(room.host, { type: 'joined', peer: member.peer })) {
            end(member, '房主连接已中断'); return;
          }
          send(member, { type: 'ready', code: room.code, peer: member.peer, ...status() });
        } else end(member, '请先创建或加入中转房间');
        return;
      }
      const room = member.room;
      if (msg.type === 'drop' && room.host === member && typeof msg.peer === 'string') {
        const guest = room.guests.get(msg.peer);
        if (guest) end(guest, '与房主的连接已结束，请重新加入');
      } else if (msg.type === 'data' && typeof msg.data === 'string') {
        if (room.host === member) {
          const guest = typeof msg.peer === 'string' ? room.guests.get(msg.peer) : undefined;
          if (guest) send(guest, { type: 'data', data: msg.data });
        } else {
          // 客人不能指定发送方或接收方；由已绑定的 socket 决定路由。
          send(room.host, { type: 'data', peer: member.peer, data: msg.data });
        }
      } else end(member, '无效的中转操作');
    });
  });
  const heartbeat = setInterval(() => {
    const now = Date.now();
    for (const member of members) {
      if (now - member.seen > config.idleMs || (!member.room && now - member.created > config.registrationMs)) {
        end(member, '中转连接超时，请重新加入');
      }
    }
  }, Math.min(1000, config.idleMs));
  heartbeat.unref();
  return {
    server, status,
    async close() {
      clearInterval(heartbeat);
      for (const member of [...members]) { remove(member); member.socket.terminate(); }
      await new Promise<void>(resolve => wss.close(() => resolve()));
      if (server.listening) await new Promise<void>(resolve => server.close(() => resolve()));
    },
  };
}
