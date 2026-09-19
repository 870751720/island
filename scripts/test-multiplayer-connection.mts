import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import ts from 'typescript';

type Policy = { connect?: 'fail' | 'stall'; subscribe?: 'fail' | 'stall'; delay?: number };

function harness() {
  let now = 0;
  let nextTimer = 0;
  const timers = new Map<number, { at: number; fn: () => void; interval?: number }>();
  const later = (fn: () => void, delay = 0) => {
    const id = ++nextTimer;
    timers.set(id, { at: now + delay, fn });
    return id;
  };
  const clear = (id: number) => timers.delete(id);
  const every = (fn: () => void, interval: number) => {
    const id = later(fn, interval);
    timers.get(id)!.interval = interval;
    return id;
  };
  const drain = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
  const advance = async (ms: number) => {
    await drain();
    const end = now + ms;
    while (true) {
      const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at;
      timers.delete(next[0]);
      if (next[1].interval) timers.set(next[0], { ...next[1], at: now + next[1].interval });
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
      exports, crypto, TextEncoder, TextDecoder, AbortController, process: { env: {} },
      setTimeout: later, clearTimeout: clear,
      setInterval: every, clearInterval: clear,
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
  const url = 'wss://43.110.116.98/signaling';
  return { load, clients, url, backup: 'wss://broker.emqx.io:8084/mqtt', policies, publications, drain, advance, timers };
}

// 房主双节点监听，客人正常情况下只连接自有节点。
{
  const h = harness();
  const { HostSignal, GuestSignal } = h.load('Signaling');
  const { signal: host, roomCode } = await HostSignal.create();
  assert.match(roomCode, /^\d{6}$/);
  host.onPeerJoined = (id: string) => host.send(id, { description: { type: 'offer' } });
  const guest = new GuestSignal();
  let ready = 0;
  let offers = 0;
  guest.onReady = () => ready++;
  guest.onSignal = () => offers++;
  await guest.connect(roomCode);
  await h.drain();
  assert.equal(ready, 1);
  assert.equal(offers, 1);
  assert.equal(h.clients.length, 3);
  assert.ok(h.clients.filter(client => client.role === 'guest').every(client => client.url === h.url));
  let received = 0;
  host.onSignal = () => received++;
  guest.send({ candidate: { candidate: 'candidate' } });
  await h.drain();
  assert.equal(received, 1);
  guest.close(); host.close();
  assert.ok(h.clients.every(client => client.ended));
  assert.equal(h.timers.size, 0);
}

// 信令等待不消耗握手时间：查找后仍完整保留 30 秒。
{
  const h = harness();
  h.policies.set(`guest:${h.url}`, { delay: 9000 });
  const { signal: host, roomCode } = await h.load('Signaling').HostSignal.create();
  const guest = new (h.load('NetGuest').NetGuest)();
  let closed = 0;
  const statuses: string[] = [];
  guest.onClosed = () => closed++;
  guest.onConnectionStatus = (status: string) => statuses.push(status);
  const connecting = guest.join(roomCode, 'test');
  await h.advance(9000);
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

// 取消覆盖连接、订阅与找房等待，释放连接与计时器；迟到消息不再回调。
for (const stage of ['connect', 'subscribe', 'ready']) {
  const h = harness();
  if (stage === 'connect') h.policies.set(`guest:${h.url}`, { connect: 'stall' });
  if (stage === 'subscribe') h.policies.set(`guest:${h.url}`, { subscribe: 'stall' });
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

// 两个节点均不可用或房间均不存在时，最后报错并释放两个尝试。
for (const failure of ['missing', 'connect', 'subscribe']) {
  const h = harness();
  for (const url of [h.url, h.backup]) {
    if (failure === 'connect') h.policies.set(`guest:${url}`, { connect: 'fail' });
    if (failure === 'subscribe') h.policies.set(`guest:${url}`, { subscribe: 'fail' });
  }
  const guest = new (h.load('Signaling').GuestSignal)();
  const result = guest.connect('12345').catch((error: Error) => error);
  await h.advance(40_000);
  assert.match((await result).message, failure === 'connect' ? /无法连接联机服务/ : failure === 'subscribe' ? /订阅房间失败/ : /未找到房间/);
  assert.equal(h.clients.length, 2);
  assert.ok(h.clients.every(client => client.ended));
  assert.equal(h.timers.size, 0);
}

// 房主两个节点都不可达或订阅失败，不能错误地创建房间。
for (const failure of ['connect', 'subscribe']) {
  const h = harness();
  for (const url of [h.url, h.backup]) h.policies.set(`host:${url}`, failure === 'connect' ? { connect: 'fail' } : { subscribe: 'fail' });
  await assert.rejects(h.load('Signaling').HostSignal.create());
  assert.equal(h.clients.length, 2);
  assert.ok(h.clients.every(client => client.ended));
  assert.equal(h.timers.size, 0);
}

// 旧加入尝试取消后立刻重试，旧异常不得关闭新连接。
{
  const h = harness();
  h.policies.set(`guest:${h.url}`, { connect: 'stall' });
  const { signal: host, roomCode } = await h.load('Signaling').HostSignal.create();
  const guest = new (h.load('NetGuest').NetGuest)();
  let closed = 0;
  guest.onClosed = () => closed++;
  const old = guest.join(roomCode, 'old');
  await h.drain();
  h.policies.delete(`guest:${h.url}`);
  await guest.join(roomCode, 'new');
  await old;
  assert.equal(closed, 0);
  assert.ok(guest.net);
  guest.dispose(); host.close();
  await h.drain();
  assert.ok(h.clients.every(client => client.ended));
  assert.equal(h.timers.size, 0);
}

// 握手独立超时；临时断开容忍45秒，恢复取消计时，重复通知不延期。
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
  await h.advance(44_000);
  assert.equal(closed, 1);
  guest.pc.connectionState = 'connected';
  guest.pc.onconnectionstatechange();
  await h.advance(2000);
  assert.equal(closed, 1);
  guest.pc.connectionState = 'disconnected';
  guest.pc.onconnectionstatechange();
  await h.advance(44_000);
  guest.pc.onconnectionstatechange();
  assert.equal(closed, 1);
  await h.advance(1000);
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

// 自有节点对双方、仅房主、仅客人不可达，以及连接/订阅超时，都能在备用节点相遇。
for (const scenario of ['both', 'host', 'guest', 'stall', 'subscribe', 'subscribe-stall', 'slow-backup']) {
  const h = harness();
  if (scenario === 'both' || scenario === 'host') h.policies.set(`host:${h.url}`, { connect: 'fail' });
  if (scenario !== 'host') h.policies.set(`guest:${h.url}`,
    scenario === 'stall' ? { connect: 'stall' } : scenario === 'subscribe' ? { subscribe: 'fail' }
      : scenario === 'subscribe-stall' ? { subscribe: 'stall' } : { connect: 'fail' });
  if (scenario === 'slow-backup') h.policies.set(`host:${h.backup}`, { delay: 9000 });
  const { HostSignal, GuestSignal } = h.load('Signaling');
  const { signal: host, roomCode } = await HostSignal.create();
  let joins = 0;
  host.onPeerJoined = (id: string) => { joins++; host.send(id, { description: { type: 'offer' } }); };
  const guest = new GuestSignal();
  let ready = 0;
  let offers = 0;
  guest.onReady = () => ready++;
  guest.onSignal = () => offers++;
  const connecting = guest.connect(roomCode);
  await h.advance(20_000);
  await connecting;
  assert.equal(ready, 1, scenario);
  assert.equal(offers, 1, scenario);
  assert.equal(joins, 1, scenario);
  let answers = 0;
  host.onSignal = () => answers++;
  guest.send({ description: { type: 'answer' } });
  await h.drain();
  assert.equal(answers, 1, scenario);
  assert.ok(h.publications.filter(p => p.message.type === 'signal').every(p => p.url === h.backup));
  // 旧节点的迟到 ready/offer 不得触发二次入场或跨节点回复。
  const old = h.clients.find(client => client.role === 'guest' && client.url === h.url)!;
  old.emit('message', '', new TextEncoder().encode('{"type":"ready"}'));
  old.emit('message', '', new TextEncoder().encode('{"type":"signal","data":{"description":{"type":"offer"}}}'));
  assert.equal(ready, 1);
  assert.equal(offers, 1);
  guest.close(); host.close();
  await h.drain();
  assert.ok(h.clients.every(client => client.ended));
  assert.equal(h.timers.size, 0);
}

// 备用节点不可用不能拖慢自有节点开房；后台等待在关闭时一并取消。
{
  const h = harness();
  h.policies.set(`host:${h.backup}`, { connect: 'stall' });
  const { signal: host } = await h.load('Signaling').HostSignal.create();
  await h.advance(10_000);
  host.close();
  await h.advance(20_000);
  assert.ok(h.clients.every(client => client.ended));
  assert.equal(h.timers.size, 0);
}

// 已进入备用节点连接等待时取消，不能继续查房或遗留重试。
{
  const h = harness();
  h.policies.set(`guest:${h.url}`, { connect: 'fail' });
  h.policies.set(`guest:${h.backup}`, { connect: 'stall' });
  const guest = new (h.load('Signaling').GuestSignal)();
  const result = guest.connect('12345').catch((error: Error) => error);
  await h.drain();
  guest.close();
  assert.match((await result).message, /取消/);
  await h.advance(30_000);
  assert.equal(h.clients.length, 2);
  assert.ok(h.clients.every(client => client.ended));
  assert.equal(h.timers.size, 0);
}

// 辅助候选拒绝后仍处理原始候选，普通连接保持不变。
{
  const h = harness();
  const lan = h.load('VirtualLan');
  for (const ip of ['127.0.0.1', '224.1.1.1', '1.2.3.999', '10.01.0.1', '169.254.1.1', '']) assert.equal(lan.validVirtualLanAddress(ip), false);
  lan.setVirtualLanAddress('10.20.0.2');
  const original = { candidate: 'candidate:abc 1 udp 2122260223 hidden.local 45678 typ host generation 0 ufrag xyz', sdpMid: '0', usernameFragment: 'xyz' };
  const extra = lan.virtualLanCandidate(original, '10.20.0.2');
  assert.match(extra.candidate, /10\.20\.0\.2 45678 typ host/);
  assert.equal(extra.usernameFragment, 'xyz');
  assert.match(extra.candidate.split(' ')[0], /^candidate:[a-zA-Z0-9+/]{1,32}$/);
  const longFoundation = { ...original, candidate: original.candidate.replace('abc', 'a'.repeat(32)) };
  assert.match(lan.virtualLanCandidate(longFoundation, '10.20.0.2').candidate.split(' ')[0], /^candidate:[a-zA-Z0-9+/]{1,32}$/);
  for (const ipv6 of ['2001:db8::1', '[2001:db8::1]']) assert.equal(lan.virtualLanCandidate({ ...original, candidate: original.candidate.replace('hidden.local', ipv6) }, '10.20.0.2'), null);
  assert.match(original.candidate, /hidden.local/);
  for (const candidate of [original.candidate.replace('udp', 'tcp'), original.candidate.replace('typ host', 'typ srflx')]) assert.equal(lan.virtualLanCandidate({ ...original, candidate }, '10.20.0.2'), null);
  const signals: any[] = [];
  const peer = new (h.load('PeerNet').PeerNet)('host', (signal: any) => signals.push(signal));
  peer.pc.onicecandidate({ candidate: { toJSON: () => original } });
  peer.pc.onicecandidate({ candidate: { toJSON: () => original } });
  assert.equal(signals.filter(signal => signal.virtualLan).length, 1);
  assert.equal(signals.filter(signal => !signal.virtualLan).length, 2);
  const received: string[] = [];
  peer.pc.addIceCandidate = async (candidate: any) => { received.push(candidate.candidate); if (candidate.candidate.includes('10.20.0.2')) throw new Error('unsupported'); };
  await peer.receiveSignal({ candidate: extra, virtualLan: true });
  await peer.receiveSignal({ candidate: original });
  await peer.receiveSignal({ description: { type: 'answer', sdp: 'test' } });
  assert.equal(received.length, 2);
  peer.close();
  lan.setVirtualLanAddress('');
  const plain: any[] = [];
  const ordinary = new (h.load('PeerNet').PeerNet)('host', (signal: any) => plain.push(signal));
  ordinary.pc.onicecandidate({ candidate: { toJSON: () => original } });
  assert.equal(plain.length, 1);
  ordinary.close();
}
{
  const h = harness();
  const diagnostics = h.load('DirectDiagnostics');
  const report = new Map<string, any>([
    ['local', { type: 'local-candidate', candidateType: 'host', port: 12345 }],
    ['remote', { type: 'remote-candidate', address: '172.19.163.3', port: 45678, candidateType: 'host' }],
    ['pair', { type: 'candidate-pair', localCandidateId: 'local', remoteCandidateId: 'remote', state: 'failed', requestsSent: 5, responsesReceived: 0 }],
  ]);
  const lines = diagnostics.describeCandidateChecks(report).join('\n');
  assert.match(lines, /172\.19\.163\.3:45678/);
  assert.match(lines, /检查发出 5 \/ 响应收到 0 \/ 检查收到 \?/);
  assert.match(lines, /地址隐藏/);
  assert.match(diagnostics.describeCandidateChecks(new Map()).join(''), /无法判断/);
  await diagnostics.recordCandidateChecks({ getStats: async () => report }, 9, '测试失败');
  assert.match(h.load('VirtualLan').getDirectDiagnostics().join('\n'), /测试失败时的路径检查快照/);
  await diagnostics.recordCandidateChecks({ getStats: async () => { throw new Error('closed'); } }, 10, '测试释放');
  assert.match(h.load('VirtualLan').getDirectDiagnostics().join('\n'), /无法读取路径检查统计/);
}
console.log('Signaling, handshake deadlines, virtual LAN candidates and failure diagnostics passed');
