import assert from 'node:assert/strict';
// @ts-ignore Node 22 直接运行 TypeScript，需要保留文件扩展名。
import { WildlifeMovement } from '../src/game/entities/WildlifeMovement.ts';

// 等待期间不探测，一秒后恢复。
{
  const m = new WildlifeMovement(), body = {}, p = { x: 0, z: 0 };
  let probes = 0;
  const blocked = () => { probes++; return false; };
  m.step(body, p, 0, 0.02, blocked);
  const initial = probes;
  for (let i = 0; i < 49; i++) {
    m.advance(0.02);
    assert.equal(m.step(body, p, 0, 0.02, blocked), false);
  }
  assert.equal(probes, initial);
  m.advance(0.021);
  assert.equal(m.step(body, p, 0, 0.02, () => { probes++; p.x += 0.1; return true; }), true);
  assert.equal(probes, initial + 1);
}
// 不同帧率下原地往返都要停下。
for (const dt of [1 / 30, 1 / 60, 1 / 120]) {
  const m = new WildlifeMovement(), body = {}, p = { x: 0, z: 0 };
  for (let i = 0; i < Math.ceil(0.6 / dt); i++) {
    m.advance(dt);
    m.step(body, p, 0, dt, () => { p.x += (i % 2 ? -1 : 1) * 3 * dt; return true; });
  }
  assert.equal(m.waiting(body), true);
}
// 正常慢走、背向目标绕障不误判。
for (const speed of [0.1, 3]) {
  const m = new WildlifeMovement(), body = {}, p = { x: 0, z: 0 };
  for (let i = 0; i < 120; i++) {
    m.advance(1 / 60);
    m.step(body, p, Math.PI, 1 / 60, a => { p.x += Math.cos(a) * speed / 60; return true; });
    assert.equal(m.waiting(body), false);
  }
}
// 选定侧向无路就等待，不立即左右切换；个体互不影响。
{
  const m = new WildlifeMovement(), body = {}, p = { x: 0, z: 0 };
  m.step(body, p, 0, 0.02, a => { if (a <= 0) return false; p.z += 0.1; return true; });
  m.advance(0.02);
  const attempts: number[] = [];
  m.step(body, p, 0, 0.02, a => { attempts.push(a); return a < 0; });
  assert.ok(attempts.every(a => a >= 0));
  assert.equal(m.waiting(body), true);
  assert.equal(m.waiting({}), false);
}
console.log('Wildlife movement checks passed');
