import type { Euler } from 'three';

/** 与步行动画共用关节缓冲；脚下站位不随随机姿态切换，避免滑出板面。 */
export function skateboardPose(targets: Euler[], pose: number, elapsed: number, moving: boolean): number {
  for (const target of targets) target.set(0, 0, 0);
  const [body, head, left, right, elbowL, elbowR, legL, legR, kneeL, kneeR] = targets;
  const sway = Math.sin(elapsed * 2.8) * (moving ? 0.035 : 0.012);
  const crouch = moving && pose === 1;
  const stretch = moving && pose === 2;
  // 慢节奏重心调整：双臂错相补偿，避免像步行时机械地甩手。
  const balance = Math.sin(elapsed * 2.1) * (moving ? 1 : 0.06);
  const follow = Math.sin(elapsed * 2.1 + 0.8) * (moving ? 1 : 0.06);
  body.set((crouch ? 0.28 : 0.08) + follow * 0.025, -0.55 + balance * 0.1, sway + balance * 0.04);
  head.set(crouch ? -0.16 : -0.04, -body.y, -body.z * 0.7);
  left.set((crouch ? -0.65 : -0.2) + balance * 0.2, follow * 0.12,
    (stretch ? 1.05 : crouch ? 0.38 : 0.65) + follow * 0.18);
  right.set((crouch ? 0.15 : 0.18) - follow * 0.24, -balance * 0.12,
    (stretch ? -1.05 : crouch ? -0.4 : -0.65) + balance * 0.18);
  elbowL.set((crouch ? -0.55 : -0.3) - follow * 0.16, 0, balance * 0.06);
  elbowR.set((crouch ? -0.85 : -0.35) + balance * 0.18, 0, -follow * 0.06);
  legL.set(crouch ? -0.52 : -0.28, 0, 0);
  legR.set(crouch ? -0.26 : 0.16, 0, 0);
  kneeL.x = crouch ? 0.8 : 0.3;
  kneeR.x = crouch ? 0.65 : 0.2;
  targets[10].x = -legL.x - kneeL.x;
  targets[11].x = -legR.x - kneeR.x;
  return crouch ? 0.19 : 0.215;
}
