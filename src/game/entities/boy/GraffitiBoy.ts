import { ModelKit, limbs, type BoyRig } from './ModelKit';

/** 夸张方圆大头、黑色锯齿短发、青绿宽大卫衣与红色板鞋。 */
export function graffitiBoy(kit: ModelKit, rig: BoyRig): void {
  const h = rig.head, b = rig.upperBody;
  const skin = '#f3bd91', ink = '#242d38', teal = '#29b3a5';
  kit.box(h, skin, [0, -0.02, 0], [0.78, 0.65, 0.58], 0.16);
  kit.box(h, ink, [0, 0.23, -0.015], [0.81, 0.25, 0.59], 0.09);
  for (let i = 0; i < 5; i++) kit.cone(h, ink, [-0.29 + i * 0.14, 0.105 + (i % 2) * 0.025, 0.28],
    0.115, 0.23, [0, 0, Math.PI + (i - 2) * 0.12]);
  for (const side of [-1, 1]) {
    kit.oval(h, skin, [side * 0.4, -0.04, 0], [0.055, 0.085, 0.055]);
    kit.box(h, '#fff8e7', [side * 0.16, -0.035, 0.288], [0.15, 0.19, 0.025], 0.05);
    kit.oval(h, ink, [side * 0.146, -0.044, 0.307], [0.039, 0.063, 0.012]);
    kit.box(h, ink, [side * 0.155, 0.088, 0.293], [0.17, 0.035, 0.025], 0.01, [0, 0, side * 0.13]);
  }
  kit.box(h, '#d77858', [0.018, -0.142, 0.302], [0.068, 0.048, 0.045], 0.02);
  kit.box(h, ink, [0.055, -0.235, 0.287], [0.17, 0.05, 0.023], 0.02, [0, 0, 0.12]);
  kit.box(h, '#fff8e7', [0.055, -0.222, 0.3], [0.13, 0.014, 0.01], 0.004);
  kit.body(b, teal, [[0, -0.035], [0.29, -0.035], [0.32, 0.1], [0.31, 0.37], [0.2, 0.49], [0, 0.49]], 0.72);
  kit.oval(b, '#218b85', [0, 0.44, -0.11], [0.235, 0.12, 0.17]);
  kit.box(b, '#e6efb9', [0, 0.23, 0.232], [0.16, 0.17, 0.018], 0.025, [0, 0, -0.22]);
  kit.box(b, '#218b85', [0, 0.07, 0.233], [0.28, 0.075, 0.022], 0.02);
  for (const side of [-1, 1]) kit.box(b, '#f6edd1', [side * 0.065, 0.34, 0.225], [0.016, 0.12, 0.018], 0.005);
  limbs(kit, rig, { skin, sleeve: teal, pants: '#343c61', shoe: '#df634d', arm: 0.065,
    leg: 0.07, sleeveWidth: 0.135, shortsWidth: 0.12, trouserLength: 0.3 });
}
