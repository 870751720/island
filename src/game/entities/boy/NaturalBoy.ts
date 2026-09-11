import * as THREE from 'three';
import { ModelKit, type BoyRig } from './ModelKit';

/** 日常少年：共享连续的衣身轮廓，以头脸比例、肩形和穿着区分年龄。 */
export function naturalBoy(kit: ModelKit, rig: BoyRig, teen: boolean): void {
  const skin = '#d9ad8c', hair = '#242424';
  const shirt = teen ? '#e4e7e3' : '#7597ac', pants = teen ? '#35434d' : '#555d69';
  const h = rig.head, b = rig.upperBody;
  const cy = teen ? -0.055 : -0.075, rx = teen ? 0.105 : 0.12, ry = teen ? 0.12 : 0.14;
  const rz = teen ? 0.103 : 0.112;
  kit.oval(h, skin, [0, cy, 0], [rx, ry, rz]);
  // 半球发帽只覆盖头顶，避免整颗球形头发吞掉小脸。
  kit.add(h, new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.48)
    .scale(rx * 1.045, ry * 1.04, rz * 1.045), hair, [0, cy, -0.006]);
  kit.oval(h, hair, [0, cy + 0.009, -rz * 0.67], [rx * 0.94, ry * 0.66, rz * 0.45]);
  for (const side of [-1, 1]) {
    kit.oval(h, skin, [side * rx * 0.96, cy - 0.005, 0], [0.019, 0.03, 0.021]);
    kit.oval(h, '#302b28', [side * rx * 0.4, cy + 0.004, rz * 0.922], [0.009, 0.006, 0.005]);
    kit.box(h, '#38312c', [side * rx * 0.4, cy + 0.026, rz * 0.9], [0.026, 0.005, 0.006], 0.002);
    kit.oval(h, hair, [side * rx * 0.88, cy + 0.036, -0.005], [0.016, 0.035, 0.051]);
  }
  // 压低、贴着额头的短刘海，不使用锥形发束。
  for (let i = 0; i < 4; i++) kit.oval(h, hair,
    [(i - 1.5) * rx * 0.4, cy + ry * 0.56 + (teen ? i * 0.004 : 0), rz * 0.7],
    [rx * 0.29, 0.026, 0.026], [0, 0, teen ? -0.18 : 0]);
  kit.oval(h, skin, [0, cy - 0.016, rz * 0.97], [0.013, 0.022, 0.019]);
  kit.oval(h, '#9b6d59', [0, cy - 0.052, rz * 0.88], [0.022, 0.0035, 0.004]);

  kit.capsule(b, skin, [0, 0.525, 0], teen ? 0.05 : 0.056, 0.1);
  // 衣身从腰到肩颈连续收口，袖根与肩部重叠，遮住活动关节。
  kit.body(b, shirt, [[0, -0.035], [0.19, -0.035], [0.195, 0.06],
    [teen ? 0.205 : 0.215, 0.27], [0.265, 0.395], [0.22, 0.435],
    [0.105, 0.478], [0.063, 0.485], [0, 0.485]], 0.62);
  kit.tube(b, teen ? '#bbc4c4' : '#58798e', [0, 0.48, 0], 0.065, 0.075, 0.017, 0.85);
  // 腰胯用同色整体体积连接两条裤腿，不留悬空大腿根。
  kit.oval(rig.root, pants, [0, 0.575, 0], [0.209, 0.115, 0.129]);
  for (let i = 0; i < 2; i++) {
    const a = rig.arms[i], e = rig.elbows[i], l = rig.legs[i], k = rig.knees[i];
    kit.capsule(a, shirt, [0, -0.048, 0], 0.079, 0.085, 0.95);
    kit.capsule(a, skin, [0, -0.145, 0], 0.052, 0.115);
    kit.capsule(e, skin, [0, -0.06, 0], 0.048, 0.15);
    kit.oval(rig.hands[i], skin, [0, -0.004, 0], [0.042, 0.058, 0.032]);
    kit.capsule(l, pants, [0, -0.082, 0], 0.093, 0.125, 1.02);
    kit.capsule(l, skin, [0, -0.203, 0], 0.069, 0.065);
    kit.capsule(k, skin, [0, -0.09, 0], 0.063, 0.19);
    kit.tube(k, '#e7e5dd', [0, -0.205, 0], 0.055, 0.052, 0.073);
    kit.box(k, teen ? '#58616a' : '#e0dfd6', [0, -0.281, 0.031], [0.138, 0.12, 0.232], 0.035);
    kit.box(k, '#c9c9c1', [0, -0.328, 0.032], [0.14, 0.023, 0.235], 0.009);
  }
}
