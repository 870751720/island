import { ModelKit, limbs, type BoyRig } from './ModelKit';

/** 棱角脸、放射刺发、红头带、单肩兽皮和赤脚的野外小猎手。 */
export function wildBoy(kit: ModelKit, rig: BoyRig): void {
  const h = rig.head, b = rig.upperBody, skin = '#b9784f', hair = '#392b29';
  kit.box(h, skin, [0, -0.045, 0], [0.52, 0.55, 0.44], 0.09);
  kit.oval(h, hair, [0, 0.11, -0.05], [0.3, 0.27, 0.24]);
  for (let i = 0; i < 9; i++) {
    const a = (i - 4) * 0.3;
    kit.cone(h, i % 2 ? '#49312a' : hair, [Math.sin(a) * 0.3, 0.17 + Math.cos(a) * 0.16, -0.005],
      0.12, 0.34, [0.1, 0, -a]);
  }
  kit.box(h, '#c8533a', [0, 0.09, 0.232], [0.55, 0.075, 0.028], 0.008);
  kit.box(h, '#df7150', [0.29, -0.005, -0.05], [0.075, 0.25, 0.035], 0.005, [0.2, 0, 0.4]);
  for (const side of [-1, 1]) {
    kit.oval(h, skin, [side * 0.27, -0.025, 0], [0.05, 0.075, 0.045]);
    kit.box(h, '#f6e6c9', [side * 0.105, -0.025, 0.226], [0.12, 0.071, 0.018], 0.016);
    kit.oval(h, '#302824', [side * 0.1, -0.027, 0.244], [0.026, 0.035, 0.012]);
    kit.box(h, hair, [side * 0.108, 0.028, 0.235], [0.14, 0.032, 0.02], 0.005, [0, 0, side * 0.21]);
    for (let i = 0; i < 2; i++) kit.box(h, '#efcf92', [side * 0.17, -0.11 - i * 0.048, 0.223],
      [0.083, 0.021, 0.012], 0.003, [0, 0, side * 0.15]);
  }
  kit.cone(h, '#9e613f', [0, -0.093, 0.245], 0.032, 0.075, [Math.PI / 2, 0, 0]);
  kit.box(h, '#683c2d', [0, -0.19, 0.216], [0.094, 0.022, 0.015], 0.007);
  kit.body(b, skin, [[0, -0.02], [0.2, -0.02], [0.2, 0.18], [0.26, 0.39], [0.14, 0.47], [0, 0.47]], 0.72);
  kit.box(b, '#967544', [-0.055, 0.25, 0.17], [0.19, 0.48, 0.06], 0.025, [0, 0, -0.37]);
  kit.tube(rig.root, '#75633f', [0, 0.55, 0], 0.21, 0.28, 0.2, 0.75);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2;
    kit.cone(rig.root, i % 2 ? '#a48a4e' : '#88733f', [Math.cos(a) * 0.21, 0.43, Math.sin(a) * 0.155],
      0.085, 0.2, [0, 0, Math.PI]);
  }
  kit.tube(rig.root, '#503c2a', [0, 0.645, 0], 0.216, 0.216, 0.055, 0.76);
  kit.cone(b, '#f5e2b3', [0.07, 0.295, 0.198], 0.025, 0.12, [0, 0, Math.PI + 0.2]);
  limbs(kit, rig, { skin, sleeve: null, pants: '#75633f', shoe: skin, arm: 0.066,
    leg: 0.065, sleeveWidth: 0, shortsWidth: 0.1, trouserLength: 0.16, barefoot: true });
  for (const arm of rig.arms) kit.tube(arm, '#c8533a', [0, -0.11, 0], 0.069, 0.069, 0.05);
}
