import * as THREE from 'three';

/** 上下肢分段运动：摆腿先屈膝收脚再伸腿落地，脚踝补偿小腿角度。 */
export function boyGait(targets: THREE.Euler[], phase: number, weight: number): void {
  const move = Math.min(weight, 1.2);
  for (let i = 0; i < 2; i++) {
    const p = phase + i * Math.PI;
    const swing = Math.sin(p);
    const recovery = Math.max(0, Math.cos(p));
    const shoulder = targets[2 + i], elbow = targets[4 + i];
    const hip = targets[6 + i], knee = targets[8 + i], ankle = targets[10 + i];
    shoulder.x = swing * 0.5 * move;
    elbow.x = -0.28 - (0.28 + 0.22 * Math.sin(p - 0.65)) * move;
    hip.x = -swing * 0.55 * move;
    knee.x = 0.055 + (0.1 + 0.95 * recovery * recovery) * move;
    // 支撑脚接近水平，摆动脚抬脚尖，避免鞋随小腿整根甩动。
    ankle.x = -(hip.x + knee.x) * (1 - recovery * 0.65) - recovery * 0.12 * move;
  }
}
