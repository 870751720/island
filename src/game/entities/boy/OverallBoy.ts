import { ModelKit, limbs, type BoyRig } from './ModelKit';

/** 梨形圆墩身材、红棕卷发、笑眯眼、芥黄 T 恤和蓝色背带裤。 */
export function overallBoy(kit: ModelKit, rig: BoyRig): void {
  const h = rig.head, b = rig.upperBody, skin = '#f1c39b', denim = '#4a708b';
  kit.oval(h, skin, [0, -0.045, 0], [0.365, 0.29, 0.285]);
  kit.oval(h, '#9b5734', [0, 0.14, -0.065], [0.37, 0.24, 0.265]);
  for (let i = 0; i < 7; i++) {
    const a = i / 6 * Math.PI;
    kit.oval(h, i % 2 ? '#ae663b' : '#8b492e', [Math.cos(a) * 0.29, 0.15 + Math.sin(a) * 0.11, 0.185], [0.103, 0.102, 0.09]);
  }
  for (const side of [-1, 1]) {
    kit.oval(h, skin, [side * 0.35, -0.04, 0], [0.055, 0.07, 0.06]);
    kit.oval(h, '#e89b7f', [side * 0.225, -0.105, 0.225], [0.07, 0.041, 0.021]);
    for (const slope of [-1, 1]) kit.box(h, '#60412e', [side * 0.135 + slope * 0.023, -0.029, 0.266],
      [0.063, 0.018, 0.014], 0.006, [0, 0, slope * -0.42]);
  }
  kit.oval(h, '#de9d77', [0, -0.095, 0.284], [0.061, 0.035, 0.028]);
  kit.oval(h, '#814733', [0, -0.174, 0.264], [0.07, 0.035, 0.013]);
  kit.box(h, '#fff2d6', [0, -0.157, 0.277], [0.103, 0.018, 0.009], 0.005);
  kit.body(b, '#dca633', [[0, -0.04], [0.27, -0.04], [0.33, 0.09], [0.32, 0.25], [0.26, 0.43], [0, 0.46]], 0.83);
  kit.body(b, denim, [[0, -0.09], [0.25, -0.09], [0.338, 0.04], [0.338, 0.14], [0, 0.14]], 0.84);
  kit.box(b, denim, [0, 0.21, 0.256], [0.34, 0.25, 0.035], 0.025);
  kit.box(b, '#365873', [0, 0.2, 0.28], [0.17, 0.1, 0.025], 0.015);
  for (const side of [-1, 1]) {
    kit.box(b, denim, [side * 0.125, 0.365, 0.205], [0.066, 0.24, 0.037], 0.012, [-0.4, 0, side * -0.13]);
    kit.oval(b, '#edcb62', [side * 0.126, 0.29, 0.28], [0.025, 0.025, 0.012]);
  }
  limbs(kit, rig, { skin, sleeve: '#dca633', pants: denim, shoe: '#954c36', arm: 0.083,
    leg: 0.077, sleeveWidth: 0.13, shortsWidth: 0.13, trouserLength: 0.31 });
  for (const leg of rig.legs) kit.tube(leg, '#91acb6', [0, -0.225, 0], 0.128, 0.128, 0.065);
}
