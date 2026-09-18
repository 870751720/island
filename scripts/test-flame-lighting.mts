import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  (module as NodeJS.Module & { _compile(code: string, filename: string): void })._compile(code, filename);
};
const THREE = require('three') as typeof import('three');
const { LightPool } = require('../src/game/world/LightPool.ts');
const scene = new THREE.Scene();
const geometry = new THREE.PlaneGeometry(200, 200, 100, 100);
geometry.rotateX(-Math.PI / 2);
const position = geometry.getAttribute('position');
for (let i = 0; i < position.count; i++) position.setY(i, position.getX(i) * 0.05);
const pool = new LightPool(scene, 6);
pool.setGround(scene, { mesh: new THREE.Mesh(geometry) });
const spec = { color: '#ff9d2e', intensity: 1.2, distance: 4.5, decay: 1.5 };
const far = Array.from({ length: 6 }, (_, i) => pool.claim(new THREE.Vector3(60 + i, 3, 0), 0.7, spec, true));
const near = Array.from({ length: 12 }, (_, i) => pool.claim(new THREE.Vector3(i - 6, (i - 6) * 0.05, 0), 0.7, spec, true));
const camera = new THREE.OrthographicCamera(-15, 15, 15, -15, 0.1, 100);
function update(x: number) {
  camera.position.set(x, 20, 15);
  camera.lookAt(x, 0, 0);
  pool.update(camera, new THREE.Vector3(x, 0, 0), 1);
}
const lights = () => scene.children.filter((item): item is import('three').PointLight => item instanceof THREE.PointLight);
update(0);
assert.equal(lights().length, 6, '超过六个火源不会增加场景点光源');
assert.ok(lights().every(light => Math.abs(light.position.x) < 10 && light.intensity > 0), '后来放置的近处火源获得动态灯位');
const glow = scene.children.find(item => item instanceof THREE.Mesh) as import('three').Mesh;
assert.ok(glow.visible && glow.geometry.getAttribute('position').count > 18 * 6, '全部十八支火把都保留地面贴面');
const glowPositions = glow.geometry.getAttribute('position');
for (let i = 0; i < glowPositions.count; i++) {
  assert.ok(Math.abs(glowPositions.getY(i) - glowPositions.getX(i) * 0.05 - 0.018) < 1e-5, '光晕贴合斜坡');
}
update(63);
assert.ok(lights().every(light => light.position.x >= 60), '移动视野后重新分配远处火源');
const removed = far[0];
pool.release(removed);
pool.release(removed);
update(63);
assert.equal(lights().filter(light => light.intensity > 0).length, 5, '回收立即取消照明，重复释放不污染池');
const relit = pool.claim(new THREE.Vector3(60, 3, 0), 0.7, spec, true);
relit.intensity = 3;
relit.distance = 13;
update(63);
const assigned = lights().find(light => light.position.x === 60)!;
assert.ok(assigned.intensity > 2.9 && assigned.distance === 13, '复燃及火堆亮度范围变化正常传递');
for (const source of [...far, ...near, relit]) pool.release(source);
update(0);
assert.ok(lights().every(light => light.intensity === 0));
assert.equal(glow.visible, false, '清空实体后清空光晕');
assert.equal(lights().length, 6, '清空实体仍保持固定灯数');
pool.dispose();
assert.equal(scene.children.length, 0, '销毁释放灯光和光晕批次');
geometry.dispose();
console.log('火源超额、视野调度、斜坡光晕、回收复燃、固定灯数及销毁检查通过');
