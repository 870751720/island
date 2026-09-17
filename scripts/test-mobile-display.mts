import assert from 'node:assert/strict';
// @ts-ignore Node 22 直接运行 TypeScript，需要保留文件扩展名。
import { getDeviceType } from '../src/platform/device.ts';
// @ts-ignore Node 22 直接运行 TypeScript，需要保留文件扩展名。
import { LandscapeController } from '../src/platform/LandscapeController.ts';
// @ts-ignore Node 22 直接运行 TypeScript，需要保留文件扩展名。
import { getLandscapeMode, setLandscapeMode, subscribeDisplaySettings } from '../src/platform/displaySettings.ts';

for (const [userAgent, platform, maxTouchPoints, mobile, expected] of [
  ['Mozilla/5.0 (iPhone)', 'iPhone', 5, undefined, 'mobile'],
  ['Mozilla/5.0 (Linux; Android 14)', 'Linux armv8l', 5, false, 'mobile'],
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel', 5, false, 'mobile'],
  ['Mozilla/5.0 (Windows NT 10.0)', 'Win32', 10, false, 'desktop'],
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel', 0, undefined, 'desktop'],
  ['Unknown', '', 1, true, 'mobile'],
] as const) {
  assert.equal(getDeviceType({ userAgent, platform, maxTouchPoints, mobile }), expected);
}

const stored = new Map([['island.display.landscape', 'on']]);
Object.defineProperty(globalThis, 'window', { configurable: true, value: {
  localStorage: { getItem: (key: string) => stored.get(key), setItem: (key: string, value: string) => stored.set(key, value) },
} });
assert.equal(getLandscapeMode(), true, '恢复上次开启的全局偏好');
let updates = 0;
const unsubscribe = subscribeDisplaySettings(() => updates++);
setLandscapeMode(false);
assert.equal(stored.get('island.display.landscape'), 'off');
assert.equal(getLandscapeMode(), false);
assert.equal(updates, 1);
unsubscribe();
Object.defineProperty(globalThis, 'window', { configurable: true, value: {
  get localStorage() { throw new Error('storage blocked'); },
} });
setLandscapeMode(true);
assert.equal(getLandscapeMode(), true, '存储被拒绝时保留会话选择');
assert.equal(updates, 1, '卸载订阅后不再通知');

const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function environment({ gesture = true, supported = true, rejectFullscreen = false } = {}) {
  let locks = 0;
  let unlocks = 0;
  let requests = 0;
  let exits = 0;
  let pendingFullscreen: (() => Promise<void>) | undefined;
  let pendingLock: (() => Promise<void>) | undefined;
  const doc = Object.assign(new EventTarget(), {
    fullscreenElement: null as object | null,
    fullscreenEnabled: true,
    visibilityState: 'visible',
    documentElement: { requestFullscreen: async () => {
      requests++;
      if (rejectFullscreen) throw new Error('denied');
      await pendingFullscreen?.();
      doc.fullscreenElement = doc.documentElement;
      doc.dispatchEvent(new Event('fullscreenchange'));
    } },
    exitFullscreen: async () => {
      exits++;
      doc.fullscreenElement = null;
      doc.dispatchEvent(new Event('fullscreenchange'));
    },
  });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userActivation: { isActive: gesture } } });
  Object.defineProperty(globalThis, 'screen', { configurable: true, value: { orientation: {
    lock: supported ? async (direction: string) => {
      assert.equal(direction, 'landscape');
      locks++;
      await pendingLock?.();
    } : undefined,
    unlock: () => { unlocks++; },
  } } });
  return {
    doc, counts: () => ({ locks, unlocks, requests, exits }),
    deferFullscreen: (callback: () => Promise<void>) => { pendingFullscreen = callback; },
    deferLock: (callback: () => Promise<void>) => { pendingLock = callback; },
  };
}

{
  const env = environment();
  const controller = new LandscapeController();
  controller.setEnabled(true);
  await flush();
  assert.equal(env.counts().locks, 1);
  assert.equal(env.counts().requests, 1);
  controller.setEnabled(false);
  await flush();
  assert.equal(env.counts().exits, 1);
  assert.ok(env.counts().unlocks > 0);
  controller.dispose();
}
{
  const env = environment({ supported: false });
  const controller = new LandscapeController();
  controller.setEnabled(true);
  env.doc.dispatchEvent(new Event('click'));
  await flush();
  assert.equal(env.counts().requests, 0, '缺少锁定接口不进入无用全屏');
  controller.dispose();
}
{
  const env = environment({ rejectFullscreen: true });
  const controller = new LandscapeController();
  controller.setEnabled(true);
  await flush();
  assert.equal(env.counts().locks, 1, '全屏拒绝后仍可尝试宿主方向锁');
  env.doc.dispatchEvent(new Event('click'));
  await flush();
  assert.equal(env.counts().requests, 1, '不反复请求被拒绝的全屏');
  controller.dispose();
}
{
  const env = environment({ gesture: false });
  const controller = new LandscapeController();
  controller.setEnabled(true);
  await flush();
  assert.equal(env.counts().requests, 0, '刷新无用户手势时不请求全屏');
  env.doc.dispatchEvent(new Event('click'));
  await flush();
  assert.equal(env.counts().requests, 1, '首次点击恢复全屏');
  await env.doc.exitFullscreen();
  env.doc.dispatchEvent(new Event('click'));
  await flush();
  assert.equal(env.counts().requests, 1, '主动退出后不强制再次进入');
  controller.dispose();
}
{
  const env = environment();
  let resolve!: () => void;
  env.deferFullscreen(() => new Promise<void>(done => { resolve = done; }));
  const controller = new LandscapeController();
  controller.setEnabled(true);
  controller.setEnabled(false);
  resolve();
  await flush();
  assert.equal(env.counts().locks, 0, '关闭后待完成的全屏请求不能再锁定');
  assert.equal(env.counts().exits, 1);
  controller.dispose();
}
{
  const env = environment();
  env.doc.fullscreenElement = env.doc.documentElement;
  let resolve!: () => void;
  env.deferLock(() => new Promise<void>(done => { resolve = done; }));
  const controller = new LandscapeController();
  controller.setEnabled(true);
  controller.dispose();
  resolve();
  await flush();
  assert.ok(env.counts().unlocks >= 2, '卸载后异步锁定完成仍解除');
  assert.equal(env.counts().exits, 0, '不退出外部建立的全屏');
  const before = env.counts().locks;
  env.doc.dispatchEvent(new Event('click'));
  await flush();
  assert.equal(env.counts().locks, before, '卸载后不再处理点击');
}
console.log('设备识别、全局偏好与横屏生命周期检查通过');
