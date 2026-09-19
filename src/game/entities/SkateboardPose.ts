import type { Euler } from 'three';

/** 与步行动画共用关节缓冲；脚下站位不随随机姿态切换，避免滑出板面。 */
export function skateboardPose(targets: Euler[], pose: number, elapsed: number, moving: boolean): number {
  for (const target of targets) target.set(0, 0, 0);
  const [body, head, left, right, elbowL, elbowR, legL, legR, kneeL, kneeR] = targets;
  const sway = Math.sin(elapsed * 2.8) * (moving ? 0.035 : 0.012);
  const crouch = moving && pose === 1;
  const stretch = moving && pose === 2;
  body.set(crouch ? 0.28 : 0.08, -0.55, sway);
  head.set(crouch ? -0.16 : -0.04, 0.55, -sway);
  left.set(crouch ? -0.45 : -0.12, 0, stretch ? 1.05 : 0.48 + sway);
  right.set(crouch ? -0.65 : 0.12, 0, stretch ? -1.05 : -0.48 + sway);
  elbowL.x = elbowR.x = crouch ? -0.7 : -0.2;
  legL.set(crouch ? -0.52 : -0.28, 0, 0);
  legR.set(crouch ? -0.26 : 0.16, 0, 0);
  kneeL.x = crouch ? 0.8 : 0.3;
  kneeR.x = crouch ? 0.65 : 0.2;
  targets[10].x = -legL.x - kneeL.x;
  targets[11].x = -legR.x - kneeR.x;
  return crouch ? 0.19 : 0.215;
}
