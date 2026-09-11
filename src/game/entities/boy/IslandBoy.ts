import { ModelKit, limbs, type BoyRig } from './ModelKit';

/** 小头清瘦少年：金色偏分长刘海、白背心、敞开蓝马甲、珊瑚短裤与凉鞋。 */
export function islandBoy(kit: ModelKit, rig: BoyRig): void {
  const h = rig.head, b = rig.upperBody, skin = '#dba078', hair = '#d4a24e';
  kit.oval(h, skin, [0, -0.045, 0], [0.23, 0.29, 0.205]);
  kit.oval(h, hair, [0, 0.08, -0.065], [0.25, 0.25, 0.18]);
  kit.oval(h, hair, [-0.11, 0.13, 0.13], [0.15, 0.24, 0.085], [0, 0, -0.48]);
  kit.oval(h, '#e9bf6c', [-0.055, 0.16, 0.16], [0.08, 0.23, 0.045], [0, 0, -0.62]);
  for (const side of [-1, 1]) {
    kit.oval(h, skin, [side * 0.226, -0.035, 0], [0.042, 0.069, 0.04]);
    kit.box(h, '#342e2b', [side * 0.087, -0.035, 0.193], [0.059, 0.024, 0.013], 0.009);
    kit.box(h, '#705239', [side * 0.087, 0.015, 0.19], [0.079, 0.014, 0.018], 0.004, [0, 0, side * 0.12]);
    for (let j = 0; j < 3; j++) kit.oval(h, '#a76b4c', [side * (0.12 + j * 0.023), -0.092, 0.167 - j * 0.012], [0.006, 0.006, 0.004]);
  }
  kit.cone(h, '#c68b64', [0, -0.093, 0.208], 0.029, 0.085, [Math.PI / 2, 0, 0]);
  kit.box(h, '#8b4e3f', [0.018, -0.175, 0.194], [0.07, 0.013, 0.012], 0.005, [0, 0, 0.12]);
  kit.capsule(b, skin, [0, 0.51, 0], 0.065, 0.1);
  kit.body(b, '#eee9d7', [[0, 0.01], [0.18, 0.01], [0.175, 0.23], [0.225, 0.4], [0.14, 0.46], [0, 0.46]], 0.7);
  for (const side of [-1, 1]) {
    kit.box(b, '#3d7899', [side * 0.152, 0.225, 0.07], [0.1, 0.41, 0.2], 0.025, [0, 0, side * -0.08]);
    kit.box(b, '#284e6c', [side * 0.155, 0.13, 0.179], [0.075, 0.085, 0.012], 0.01);
  }
  kit.tube(rig.root, '#d87359', [0, 0.59, 0], 0.19, 0.185, 0.11, 0.75);
  limbs(kit, rig, { skin, sleeve: null, pants: '#d87359', shoe: '#735132', arm: 0.05,
    leg: 0.057, sleeveWidth: 0, shortsWidth: 0.093, trouserLength: 0.2, barefoot: true });
  for (const knee of rig.knees) {
    kit.box(knee, '#674831', [0, -0.318, 0.035], [0.17, 0.035, 0.29], 0.01);
    kit.box(knee, '#674831', [0, -0.201, 0.085], [0.168, 0.024, 0.045], 0.006);
  }
}
