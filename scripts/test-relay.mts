import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { WebSocket } from 'ws';
import { createRelayService } from '../relay/service.ts';
import { relayConfig } from '../relay/config.ts';
import { verifyRelay } from '../relay/verify.ts';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate: () => boolean, message: string) {
  for (let i = 0; i < 200; i++) { if (predicate()) return; await delay(10); }
  assert.fail(message);
}
type Message = { type: string; code?: string; peer?: string; data?: string };
async function connect(url: string) {
  const socket = new WebSocket(url);
  const messages: Message[] = [];
  let closed: string | null = null;
  socket.on('message', raw => messages.push(JSON.parse(raw.toString())));
  socket.on('close', (_code, reason) => { closed = reason.toString(); });
  socket.on('error', () => {});
  await once(socket, 'open');
  return {
    socket, messages, get closed() { return closed; },
    send(value: unknown) { socket.send(JSON.stringify(value)); },
    async register(value: unknown) {
      socket.send(JSON.stringify(value));
      await until(() => messages.some(msg => msg.type === 'ready') || closed !== null, 'registration timeout');
      return messages.find(msg => msg.type === 'ready');
    },
  };
}
async function listen(service: ReturnType<typeof createRelayService>) {
  service.server.listen(0, '127.0.0.1');
  await once(service.server, 'listening');
  const address = service.server.address();
  assert.ok(address && typeof address !== 'string');
  return `ws://127.0.0.1:${address.port}/relay`;
}

assert.equal(relayConfig({}).maxRooms, 2);
assert.equal(relayConfig({}).maxPlayers, 4);
assert.equal(relayConfig({ RELAY_MAX_ROOMS: '3', RELAY_MAX_PLAYERS: '6' }).maxPlayers, 6);
assert.throws(() => relayConfig({ RELAY_MAX_PLAYERS: '1' }));

const service = createRelayService(relayConfig({}), 'test-revision');
const url = await listen(service);
try {
  await verifyRelay(url.replace('ws:', 'http:').replace('/relay', ''), 'test-revision');
  assert.equal(service.status().rooms, 0, 'health probe must not take a room');
  const hosts = await Promise.all([connect(url), connect(url), connect(url)]);
  const created = await Promise.all(hosts.map(host => host.register({ type: 'create', version: 1 })));
  assert.equal(created.filter(Boolean).length, 2, 'concurrent create reserves only two rooms');
  const active = hosts.filter((_host, i) => created[i]);
  const codes = created.filter(Boolean).map(msg => msg!.code!);
  assert.match(hosts.find((_host, i) => !created[i])!.closed!, /房间已满/);
  const host = active[0];
  const guests = await Promise.all(Array.from({ length: 4 }, () => connect(url)));
  const joined = await Promise.all(guests.map(guest => guest.register({ type: 'join', version: 1, code: codes[0] })));
  assert.equal(joined.filter(Boolean).length, 3, 'capacity four includes host, including pending hello');
  assert.match(guests.find((_guest, i) => !joined[i])!.closed!, /人数已满/);
  const accepted = guests.filter((_guest, i) => joined[i]);
  const guest = accepted[0];
  const peer = guest.messages.find(msg => msg.type === 'ready')!.peer!;
  const other = await connect(url);
  await other.register({ type: 'join', version: 1, code: codes[1] });
  // 客人即使伪造路由 ID，也只能到自己的房主，且发送方由服务端绑定。
  guest.send({ type: 'data', peer: 'spoofed', data: '{"t":"action","name":"test","args":[]}' });
  await until(() => host.messages.some(msg => msg.type === 'data'), 'host receives guest action');
  assert.equal(host.messages.find(msg => msg.type === 'data')!.peer, peer);
  assert.equal(active[1].messages.filter(msg => msg.type === 'data').length, 0);
  assert.equal(accepted[1].messages.filter(msg => msg.type === 'data').length, 0);
  // 大于 DataChannel 单帧的完整欢迎包及连续增量都不能截断、跳帧或乱序。
  const welcome = JSON.stringify({ t: 'welcome', save: '海岛🙂'.repeat(100_000) });
  host.send({ type: 'data', peer, data: welcome });
  for (let i = 0; i < 80; i++) host.send({ type: 'data', peer, data: JSON.stringify({ t: 'worldDelta', revision: i }) });
  await until(() => guest.messages.filter(msg => msg.type === 'data').length === 81, 'all ordered payloads received');
  const payloads = guest.messages.filter(msg => msg.type === 'data');
  assert.equal(payloads[0].data, welcome);
  assert.deepEqual(payloads.slice(1).map(msg => JSON.parse(msg.data!).revision), Array.from({ length: 80 }, (_, i) => i));
  const otherPeer = other.messages.find(msg => msg.type === 'ready')!.peer;
  host.send({ type: 'data', peer: otherPeer, data: 'cross-room' });
  await delay(30);
  assert.equal(other.messages.filter(msg => msg.type === 'data').length, 0, 'host cannot address another room');
  guest.socket.close();
  await until(() => host.messages.some(msg => msg.type === 'left' && msg.peer === peer), 'guest departure releases slot');
  const replacement = await connect(url);
  assert.ok(await replacement.register({ type: 'join', version: 1, code: codes[0] }));
  host.socket.terminate();
  await until(() => service.status().rooms === 1 && replacement.closed !== null, 'host departure removes room and guests');
  assert.match(replacement.closed!, /房主已离开/);
  const newHost = await connect(url);
  assert.ok(await newHost.register({ type: 'create', version: 1 }));
  for (const client of [...hosts, ...guests, other, replacement, newHost]) client.socket.terminate();
  await until(() => service.status().rooms === 0, 'all rooms released');
} finally { await service.close(); }

// 可调整容量、应用层心跳失联、未登记占位和坏包回收。
const short = createRelayService({ ...relayConfig({}), maxRooms: 1, maxPlayers: 2, idleMs: 100, registrationMs: 50, maxPayload: 2048 });
const shortUrl = await listen(short);
try {
  const host = await connect(shortUrl);
  const room = await host.register({ type: 'create', version: 1 });
  const guest = await connect(shortUrl);
  await guest.register({ type: 'join', version: 1, code: room!.code });
  const full = await connect(shortUrl);
  assert.equal(await full.register({ type: 'join', version: 1, code: room!.code }), undefined);
  await until(() => short.status().rooms === 0 && guest.closed !== null, 'silent host releases room on timeout');
  const pending = await connect(shortUrl);
  await until(() => pending.closed !== null, 'unregistered sockets expire');
  const invalid = await connect(shortUrl);
  invalid.socket.send('not-json');
  await until(() => invalid.closed !== null, 'malformed frame rejected');
  const large = await connect(shortUrl);
  await large.register({ type: 'create', version: 1 });
  large.socket.send('x'.repeat(4096));
  await until(() => large.closed !== null && short.status().rooms === 0, 'oversized frame releases room');
} finally { await short.close(); }

// 在真实 WebSocket 中转上运行客户端连接类及 NetHost / NetGuest；游戏用最小权威桩。
function clientModules(url: string) {
  const cache = new Map<string, any>();
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
  const actions: unknown[] = [];
  function load(file: string): any {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const source = fs.readFileSync(file, 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    vm.runInNewContext(code, {
      exports, console, crypto, TextEncoder, TextDecoder, URL, AbortController, performance, WebSocket: globalThis.WebSocket,
      process: { env: { NEXT_PUBLIC_RELAY_URL: url } },
      setTimeout, clearTimeout, clearInterval,
      // 仅测试欢迎、动作与手动增量，隔离不相关的世界采样依赖。
      setInterval: (fn: () => void, ms: number) => setInterval(ms === 40 ? () => {} : fn, ms),
      localStorage: storage, window: { localStorage: storage, location: { href: 'https://example.test/island/' } },
      require(id: string) {
        if (id === './Actions') return { isNetActionName: () => true, dispatchNetAction: (...args: unknown[]) => { actions.push(args); return true; } };
        if (id === './ActionProtocol') return { hasValidNetActionArgs: () => true };
        if (id === '@/platform/compat') return { createUuid: () => crypto.randomUUID() };
        if (id === 'mqtt') return { default: { connect() { throw new Error('Relay must never open MQTT'); } } };
        if (id === 'qrcode') return { default: {} };
        const target = id.startsWith('@/') ? path.resolve('src', id.slice(2)) : path.resolve(path.dirname(file), id);
        return load(`${target}.ts`);
      },
    }, { filename: file });
    return exports;
  }
  return { load: (name: string) => load(`src/game/net/${name}.ts`), loadFile: load, actions, values };
}
const integration = createRelayService();
const integrationUrl = await listen(integration);
const modules = clientModules(integrationUrl);
const host = new (modules.load('NetHost').NetHost)();
const guest = new (modules.load('NetGuest').NetGuest)();
try {
  const code = await host.createRoom('relay');
  assert.equal(host.maxPlayers, 4);
  let started = 0;
  guest.onStarted = () => { started++; guest.begin(); };
  await guest.join(code, '测试玩家', 'girl', 'relay');
  await until(() => host.guestNames.length === 1, 'hello registers relay guest');
  assert.equal(host.guestNames[0], '测试玩家');
  const save = { terrainSeed: 77, marker: '初始快照'.repeat(90_000) };
  const position = { x: 0, y: 0, z: 0, clone() { return { x: this.x, y: this.y, z: this.z }; } };
  const session = { id: 'guest-session', survival: { state: { dead: false } }, player: {
    poseEpoch: 0, isSleeping: false, isMoving: false, currentAction: null,
    group: { position, rotation: { y: 0 } },
    applyOwnerPose(x: number, y: number, z: number) { Object.assign(position, { x, y, z }); },
    setAction() {}, setGender() {}, input: { setJoystick() {} },
  } };
  guest.readPose = () => ({ epoch: 0, x: 0, y: 0, z: 0, rotY: 0, moving: false, action: null });
  let resumed = 0;
  const game = {
    claimSavedRemoteSession: () => null, addRemoteSession: () => session,
    hudFor: () => ({ slots: [], health: 100 }),
    collectSave: () => save, sessionIds: () => ['host', session.id],
    runNetAction: (_session: unknown, action: () => void) => action(),
    suspendRemoteSession: () => ({ id: session.id }),
    resumeRemoteSession: () => { resumed++; return session; },
  };
  host.attach(game);
  await until(() => started === 1, 'welcome then start arrives');
  assert.equal(guest.welcome.state.marker, save.marker);
  guest.action('test', [1]);
  await until(() => modules.actions.length === 1, 'action executed at host');
  const revisions: number[] = [];
  guest.onWorldDelta = (revision: number) => revisions.push(revision);
  for (let i = 0; i < 40; i++) host.broadcastWorldChanges([{ section: 'resources', key: String(i), op: 'remove' }]);
  await until(() => revisions.length === 40, 'all game deltas arrive');
  assert.deepEqual(revisions, Array.from({ length: 40 }, (_, i) => i + 1));
  guest.dispose();
  await until(() => host.guestNames.length === 0, 'guest removed from host');
  await guest.join(code, '测试玩家', 'girl', 'relay');
  await until(() => started === 2 && resumed === 1, 'resume token restores character');
  const last = modules.load('NetGuest').loadLastRoom();
  assert.equal(last.mode, 'relay');
  modules.values.set('island.multiplayer.lastRoom', JSON.stringify({ code: '12345', name: '旧档' }));
  assert.equal(modules.load('NetGuest').loadLastRoom().mode, 'direct', 'old records default to direct');
  const invite = modules.loadFile('src/ui/roomInvite.ts');
  assert.equal(new URL(invite.buildInviteUrl(code, 'relay')).searchParams.get('connection'), 'relay');
  assert.equal(new URL(invite.buildInviteUrl(code)).searchParams.get('connection'), null);
  let closed = '';
  guest.onClosed = (reason: string) => { closed = reason; };
  host.dispose();
  await until(() => !!closed, 'host departure reaches game guest');
  assert.match(closed, /房主已离开/);
  // 取消进行中的开房/加入后不能留下服务器房间，旧结果不能影响重试。
  const pendingHost = host.createRoom('relay').catch((error: Error) => error);
  host.dispose();
  assert.match((await pendingHost).message, /取消/);
  const room = await host.createRoom('relay');
  host.attach(game);
  const pendingGuest = guest.join(room, '取消', undefined, 'relay');
  guest.dispose();
  await pendingGuest;
  await guest.join(room, '重试', undefined, 'relay');
  await until(() => host.guestNames.includes('重试') && guest.ready, 'retry independent from cancelled connection');
  // 浏览器 socket 的缓冲达到上限时必须断开，不能丢弃增量后继续游戏。
  closed = '';
  Object.defineProperty(guest.relay.socket, 'bufferedAmount', { value: 16 * 1024 * 1024 });
  guest.action('test', []);
  assert.match(closed, /积压过多/);
  await until(() => host.guestNames.length === 0, 'slow connection frees its player slot');
  await guest.join(room, '大包', undefined, 'relay');
  await until(() => host.guestNames.length === 1 && guest.ready, 'guest can retry after buffer overflow');
  closed = '';
  guest.action('test', ['x'.repeat(8 * 1024 * 1024)]);
  assert.match(closed, /超过中转限制/);
} finally { guest.dispose(); host.dispose(); await integration.close(); }

console.log('Relay capacity, isolation, ordered large payloads, cleanup, host authority, reconnect and invites passed');
