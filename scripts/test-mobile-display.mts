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

// 不提供方向锁定或全屏接口，依然必须立即得到横屏视口。
const viewportWindow = Object.assign(new EventTarget(), { innerWidth: 375, innerHeight: 812 });
Object.defineProperty(globalThis, 'window', { configurable: true, value: viewportWindow });
const properties = new Map<string, string>();
const root = {
  dataset: {} as Record<string, string>,
  style: { width: '', height: '', transform: '', setProperty: (key: string, value: string) => properties.set(key, value) },
  get clientWidth() { return Number.parseFloat(this.style.width); },
  get clientHeight() { return Number.parseFloat(this.style.height); },
  getBoundingClientRect: () => ({ left: 0, top: 0, right: viewportWindow.innerWidth, bottom: viewportWindow.innerHeight }),
};
Object.defineProperty(globalThis, 'document', { configurable: true, value: {
  getElementById: (id: string) => id === 'game-viewport' ? root : null,
} });
const controller = new LandscapeController(root as unknown as HTMLElement);
assert.equal(root.style.width, '375px');
controller.setEnabled(true);
assert.equal(root.style.width, '812px');
assert.equal(root.style.height, '375px');
assert.equal(root.dataset.rotated, 'true');
assert.equal(root.style.transform, 'translateX(375px) rotate(90deg)');
assert.equal(properties.get('--game-vh'), '3.75px');

// @ts-ignore Node 22 直接运行 TypeScript，需要保留文件扩展名。
const { gamePoint, gameRect, gameViewportSize } = await import('../src/platform/displayCoordinates.ts');
assert.deepEqual(gameViewportSize(), { width: 812, height: 375 });
assert.deepEqual(gamePoint({ clientX: 375, clientY: 0 }), { x: 0, y: 0 });
assert.deepEqual(gamePoint({ clientX: 0, clientY: 812 }), { x: 812, y: 375 });
// 向屏幕下方拖动，对应横向界面向右；向屏幕左方拖动，对应界面向下。
const origin = gamePoint({ clientX: 200, clientY: 100 });
const right = gamePoint({ clientX: 200, clientY: 140 });
const down = gamePoint({ clientX: 160, clientY: 100 });
assert.equal(right.x - origin.x, 40);
assert.equal(right.y - origin.y, 0);
assert.equal(down.x - origin.x, 0);
assert.equal(down.y - origin.y, 40);
class TestRect {
  x: number; y: number; width: number; height: number;
  constructor(x: number, y: number, width: number, height: number) {
    this.x = x; this.y = y; this.width = width; this.height = height;
  }
}
Object.defineProperty(globalThis, 'DOMRect', { configurable: true, value: TestRect });
const element = { getBoundingClientRect: () => ({ left: 285, top: 30, right: 355, bottom: 130 }) };
assert.deepEqual(gameRect(element as unknown as Element), new TestRect(30, 20, 100, 70));

viewportWindow.innerWidth = 812;
viewportWindow.innerHeight = 375;
viewportWindow.dispatchEvent(new Event('resize'));
assert.equal(root.dataset.rotated, 'false', '窗口已横向时不重复旋转');
assert.deepEqual(gamePoint({ clientX: 100, clientY: 50 }), { x: 100, y: 50 });
viewportWindow.innerWidth = 375;
viewportWindow.innerHeight = 812;
viewportWindow.dispatchEvent(new Event('resize'));
assert.equal(root.dataset.rotated, 'true');
controller.setEnabled(false);
assert.equal(root.style.width, '375px');
assert.equal(root.style.height, '812px');
assert.equal(root.dataset.rotated, 'false');
assert.deepEqual(gamePoint({ clientX: 100, clientY: 50 }), { x: 100, y: 50 });
controller.dispose();
viewportWindow.innerWidth = 600;
viewportWindow.dispatchEvent(new Event('resize'));
assert.equal(root.style.width, '375px', '卸载后不再监听窗口');
console.log('设备识别、偏好、页面横屏与触控坐标检查通过');
