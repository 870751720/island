import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import ts from 'typescript';

type Policy = { connect?: 'fail' | 'stall'; subscribe?: 'fail' | 'stall'; delay?: number };

function harness() {
  let now = 0;
  let nextTimer = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const later = (fn: () => void, delay = 0) => {
    const id = ++nextTimer;
    timers.set(id, { at: now + delay, fn });
    return id;
  };
  const clear = (id: number) => timers.delete(id);
  const drain = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
  const advance = async (ms: number) => {
    await drain();
    const end = now + ms;
    while (true) {
      const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at;
      timers.delete(next[0]);
      next[1].fn();
      await drain();
    }
    now = end;
    await drain();
  };
  const policies = new Map<string, Policy>();
  const clients: FakeClient[] = [];
  const publications: { url: string; topic: string; message: Record<string, unknown> }[] = [];
  class FakeClient extends EventEmitter {
    connected = false;
    ended = false;
    topics = new Set<string>();
    readonly url: string;
    readonly role: string;
    readonly policy: Policy;
    constructor(url: string, role: string, policy: Policy) {
      super();
      this.url = url;
      this.role = role;
      this.policy = policy;
      const connect = () => {
        if (this.ended || policy.connect === 'stall') return;
        if (policy.connect === 'fail') this.emit('error', new Error('unreachable'));
        else { this.connected = true; this.emit('connect'); }
      };
      if (policy.delay) later(connect, policy.delay);
      else queueMicrotask(connect);
    }
    subscribe(topic: string, _options: unknown, callback: (error: Error | null, granted?: { qos: number }[]) => void) {
      queueMicrotask(() => {
        if (this.ended || this.policy.subscribe === 'stall') return;
        if (this.policy.subscribe === 'fail') callback(null, [{ qos: 128 }]);
        else { this.topics.add(topic); callback(null, [{ qos: 0 }]); }
      });
    }
    publish(topic: string, value: string) {
      publications.push({ url: this.url, topic, message: JSON.parse(value) });
      queueMicrotask(() => {
        for (const client of clients) {
          if (client.connected && client.url === this.url && client.topics.has(topic)) {
            client.emit('message', topic, new TextEncoder().encode(value));
          }
        }
      });
    }
    end() {
      if (this.ended) return;
      this.ended = true;
      this.connected = false;
      this.emit('close');
    }
  }
  const mqtt = { connect(url: string, options: { clientId: string }) {
    const role = options.clientId.includes('_host_') ? 'host' : 'guest';
    const client = new FakeClient(url, role, policies.get(`${role}:${url}`) ?? {});
    clients.push(client);
    return client;
  } };
  class FakePeerConnection {
    connectionState = 'new';
    onconnectionstatechange?: () => void;
    createDataChannel(label: string) { return { label, readyState: 'connecting', close() {} }; }
    async createOffer() { return { type: 'offer', sdp: 'test' }; }
    async setLocalDescription() {}
    async setRemoteDescription() {}
    async addIceCandidate() {}
    close() { this.connectionState = 'closed'; }
  }
  const storage = { getItem: () => null, setItem: () => {} };
  const cache = new Map<string, Record<string, any>>();
  function load(name: string): Record<string, any> {
    if (cache.has(name)) return cache.get(name)!;
    const source = fs.readFileSync(new URL(`../src/game/net/${name}.ts`, import.meta.url), 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const exports = {};
    cache.set(name, exports);
    const context = vm.createContext({
      exports, crypto, TextEncoder, TextDecoder, AbortController,
      setTimeout: later, clearTimeout: clear,
      setInterval: later, clearInterval: clear,
      window: { setTimeout: later, clearTimeout: clear, localStorage: storage }, localStorage: storage,
      performance: { now: () => now }, RTCPeerConnection: FakePeerConnection,
      require(id: string) {
        if (id === 'mqtt') return { default: mqtt };
        if (id === '@/platform/compat') return { createUuid: () => crypto.randomUUID() };
        return load(id.replace('./', ''));
      },
    });
    vm.runInContext(code, context);
    return exports;
  }
  const urls: string[] = load('SignalBroker').BROKER_URLS;
  return { load, clients, urls, policies, publications, drain, advance, timers };
}

// 房主首选 A，客人只能访问 B：通过共同节点找到同一房间，回复也必须来自 B。
{
  const h = harness();
  const { HostSignal, GuestSignal } = h.load('Signaling');
  h.policies.set(`guest:${h.urls[0]}`, { connect: 'fail' });
  const { signal: host, roomCode } = await HostSignal.create();
  await h.drain();
  let peer = '';
  host.onPeerJoined = (id: string) => { peer = id; host.send(id, { description: { type: 'offer' } }); };
  const guest = new GuestSignal();
  let ready = 0;
  let offers = 0;
  guest.onReady = () => ready++;
  guest.onSignal = () => offers++;
  await guest.connect(roomCode);
  await h.drain();
  assert.equal(ready, 1);
  assert.equal(offers, 1);
  assert.ok(h.publications.filter(item => item.topic.includes('/down/')).every(item => item.url === h.urls[1]));
  guest.send({ candidate: { candidate: 'candidate' } });
  let received = 0;
  host.onSignal = () => received++;
  await h.drain();
  assert.equal(received, 1);
  host.forget(peer);
  guest.send({ candidate: { candidate: 'late' } });
  await h.drain();
  assert.equal(received, 1);
  guest.close(); host.close();
  assert.ok(h.clients.every(client => client.ended));
  assert.equal(h.timers.size, 0);
}

// 首个可达节点没有房间时继续查找；同一客人不同尝试身份独立。
{
  const h = harness();
  const { HostSignal, GuestSignal } = h.load('Signaling');
  h.policies.set(`host:${h.urls[0]}`, { connect: 'fail' });
  const { signal: host, roomCode } = await HostSignal.create();
  const guest = new GuestSignal();
  let ready = 0;
  guest.onReady = () => ready++;
  const connecting = guest.connect(roomCode);
  await h.advance(10_000);
  await connecting;
  assert.equal(ready, 1);
  const joins = h.publications.filter(item => item.message.type === 'join');
  assert.equal(joins.length, 2);
  assert.notEqual(joins[0].message.peer, joins[1].message.peer);
  const previous = h.clients.find(client => client.role === 'guest')!;
  previous.emit('message', '', new TextEncoder().encode('{"type":"ready"}'));
  assert.equal(ready, 1);
  assert.ok(previous.ended);
  guest.close(); host.close();
}

// 信令搜索超过 30 秒仍可找到房主，之后完整保留 30 秒握手时间。
{
  const h = harness();
  for (const url of h.urls.slice(0, 3)) h.policies.set(`host:${url}`, { connect: 'fail' });
  h.policies.set(`guest:${h.urls[0]}`, { connect: 'stall' });
  h.policies.set(`guest:${h.urls[1]}`, { subscribe: 'stall' });
  h.policies.set(`guest:${h.urls[3]}`, { delay: 5000 });
  const { signal: host, roomCode } = await h.load('Signaling').HostSignal.create();
  const guest = new (h.load('NetGuest').NetGuest)();
  let closed = 0;
  const statuses: string[] = [];
  guest.onClosed = () => closed++;
  guest.onConnectionStatus = (status: string) => statuses.push(status);
  const connecting = guest.join(roomCode, 'test');
  await h.advance(35_000);
  await connecting;
  assert.equal(closed, 0);
  assert.match(statuses.at(-1)!, /已找到房间/);
  await h.advance(29_999);
  assert.equal(closed, 0);
  await h.advance(1);
  assert.equal(closed, 1);
  host.close();
  assert.equal(h.timers.size, 0);
}

// 取消覆盖连接、订阅与找房等待，停止后续查找；迟到消息不再回调。
for (const stage of ['connect', 'subscribe', 'ready']) {
  const h = harness();
  if (stage === 'connect') h.policies.set(`guest:${h.urls[0]}`, { connect: 'stall' });
  if (stage === 'subscribe') h.policies.set(`guest:${h.urls[0]}`, { subscribe: 'stall' });
  const guest = new (h.load('Signaling').GuestSignal)();
  let ready = 0;
  guest.onReady = () => ready++;
  const result = guest.connect('12345').catch((error: Error) => error);
  await h.drain();
  guest.close();
  assert.match((await result).message, /取消/);
  await h.advance(90_000);
  assert.equal(h.clients.length, 1);
  assert.ok(h.clients[0].ended);
  h.clients[0].emit('message', '', new TextEncoder().encode('{"type":"ready"}'));
  assert.equal(ready, 0);
  assert.equal(h.timers.size, 0);
}

// 所有节点无房间、全部连接失败、订阅被拒绝均有限退出且清理连接。
for (const failure of ['missing', 'connect', 'subscribe']) {
  const h = harness();
  for (const url of h.urls) {
    if (failure === 'connect') h.policies.set(`guest:${url}`, { connect: 'fail' });
    if (failure === 'subscribe') h.policies.set(`guest:${url}`, { subscribe: 'fail' });
  }
  const guest = new (h.load('Signaling').GuestSignal)();
  const result = guest.connect('12345').catch((error: Error) => error);
  await h.advance(40_000);
  assert.match((await result).message, failure === 'connect' ? /无法连接联机服务/ : /未找到房间/);
  assert.equal(h.clients.length, 4);
  assert.ok(h.clients.every(client => client.ended));
  assert.equal(h.timers.size, 0);
}

// 房主首个节点就绪后退出，仍在后台连接的节点必须取消。
{
  const h = harness();
  for (const url of h.urls.slice(1)) h.policies.set(`host:${url}`, { connect: 'stall' });
  const { signal: host } = await h.load('Signaling').HostSignal.create();
  host.close();
  await h.drain();
  assert.ok(h.clients.every(client => client.ended));
  assert.equal(h.timers.size, 0);
}

// 旧加入尝试取消后立刻重试，旧异常不得关闭新连接。
{
  const h = harness();
  h.policies.set(`guest:${h.urls[0]}`, { connect: 'stall' });
  const { signal: host, roomCode } = await h.load('Signaling').HostSignal.create();
  const guest = new (h.load('NetGuest').NetGuest)();
  let closed = 0;
  guest.onClosed = () => closed++;
  const old = guest.join(roomCode, 'old');
  await h.drain();
  h.policies.delete(`guest:${h.urls[0]}`);
  await guest.join(roomCode, 'new');
  await old;
  assert.equal(closed, 0);
  assert.ok(guest.net);
  guest.dispose(); host.close();
  await h.drain();
  assert.ok(h.clients.every(client => client.ended));
  assert.equal(h.timers.size, 0);
}

// 房主主动握手也独立超时；重复启动不延期，既有 disconnected 行为保持不变。
{
  const h = harness();
  const PeerNet = h.load('PeerNet').PeerNet;
  const host = new PeerNet('host', () => {});
  let closed = 0;
  host.onClose = () => { closed++; host.close(); };
  await host.start();
  await h.advance(20_000);
  host.beginHandshake();
  await h.advance(10_000);
  assert.equal(closed, 1);
  const guest = new PeerNet('guest', () => {});
  guest.onClose = () => { closed++; guest.close(); };
  guest.pc.connectionState = 'disconnected';
  guest.pc.onconnectionstatechange();
  assert.equal(closed, 2);
  const connected = new PeerNet('host', () => {});
  connected.onClose = () => { throw new Error('Opened connection must not time out'); };
  await connected.start();
  connected.controlChannel.readyState = 'open';
  connected.stateChannel.readyState = 'open';
  connected.controlChannel.onopen();
  await h.advance(30_000);
  connected.close();
}

console.log('Multiplayer discovery, cancellation, routing and independent handshake deadlines passed');
