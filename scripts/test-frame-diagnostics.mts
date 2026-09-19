import assert from 'node:assert/strict';
import { FrameDiagnostics } from '../src/game/core/FrameDiagnostics.ts';

let now = 0;
const capture = new FrameDiagnostics(() => now);
capture.start({ role: '单机' });
for (let i = 0; i < 20; i++) {
  capture.begin();
  now += i === 10 ? 500 : 2;
  capture.mark('动物');
  now += 3;
  capture.mark('存档');
  capture.record(i === 11 ? 1500 : 16, i === 10 ? 503 : 5, false, { geometries: i });
}
let report = JSON.parse(capture.report());
assert.equal(report.frames, 20);
assert.equal(report.stages['动物'].maxMs, 500);
assert.equal(report.worstCpuFrames.length, 10);
assert.equal(report.worstCpuFrames[0].cpuMs, 503);
assert.equal(report.worstCpuFrames[0].stages['存档'], 3);
assert.equal(report.longestIntervals[0].intervalMs, 1500, '超过一秒的前台卡顿不可丢弃');
assert.equal(report.longestIntervals[0].previousCpuMs, 503);
assert.equal(report.initial.geometries, 0);
assert.equal(report.latest.geometries, 19);
capture.record(2000, 1000, true, {});
assert.equal(JSON.parse(capture.report()).frames, 20);
now = 120001;
capture.begin(); capture.mark('空闲'); capture.record(16, 0, false, {});
assert.equal(capture.active, false, '两分钟自动停止');
capture.record(16, 10, false, {});
assert.equal(JSON.parse(capture.report()).frames, 21);
capture.start({ role: '客人' });
report = JSON.parse(capture.report());
assert.equal(report.frames, 0);
assert.deepEqual(report.stages, {});
assert.deepEqual(report.worstCpuFrames, []);
capture.stop();
console.log('Frame diagnostics: spike retention, stage attribution, bounded history, timeout and reset passed.');
