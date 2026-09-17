import * as THREE from 'three';
import type { CompanionModel } from './CompanionModel';

function clay(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 一条短腿:锥形杆从髋部垂下,根部落在一端以便摆动 */
function makeLeg(mat: THREE.Material, x: number, y: number, z: number, len: number): THREE.Mesh {
  const leg = new THREE.Mesh(
    new THREE.CylinderGeometry(len * 0.24, len * 0.32, len, 4),
    mat
  );
  leg.geometry.translate(0, -len / 2, 0);
  leg.position.set(x, y, z);
  leg.castShadow = true;
  return leg;
}

/** 低多边形黑色博美:蓬松黑毛圆身 + 张开的鬃毛、尖耳、平贴短尾与粉舌头 */
export function makePomeranianModel(): CompanionModel {
  const group = new THREE.Group();
  const fur = clay('#26262e');
  const mane = clay('#33333d');
  const dark = clay('#101014');

  // 躯干:圆润的毛球,腿短身低,几乎贴地一团黑毛
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 6), fur);
  body.scale.set(0.95, 1, 1.3);
  body.position.y = 0.21;
  body.castShadow = true;
  group.add(body);

  // 头颈:鬃毛大盘 + 略小的头,博美标志性的「狮子脸」
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.39, 0.18);
  const ruff = new THREE.Mesh(new THREE.SphereGeometry(0.17, 7, 6), mane);
  ruff.scale.set(1.1, 0.95, 1);
  ruff.castShadow = true;
  headPivot.add(ruff);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 6), fur);
  head.position.set(0, 0.02, 0.08);
  head.castShadow = true;
  headPivot.add(head);
  // 尖耳朵:小锥体立在头顶两侧
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 4), fur);
    ear.position.set(side * 0.08, 0.16, 0.02);
    ear.rotation.z = -side * 0.25;
    headPivot.add(ear);
  }
  // 黑鼻头 + 粉舌头 + 两个白色像素点眼睛
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.028, 5, 4), dark);
  nose.position.set(0, -0.02, 0.21);
  headPivot.add(nose);
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, 0.07), clay('#e58a95'));
  tongue.position.set(0, -0.06, 0.19);
  headPivot.add(tongue);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 3), clay('#f5f5f5'));
    eye.position.set(side * 0.06, 0.04, 0.18);
    headPivot.add(eye);
  }
  group.add(headPivot);

  // 四条小短腿:短到几乎藏进毛里
  const legs = [
    makeLeg(fur, -0.09, 0.17, 0.14, 0.14),
    makeLeg(fur, 0.09, 0.17, 0.14, 0.14),
    makeLeg(fur, -0.09, 0.18, -0.14, 0.15),
    makeLeg(fur, 0.09, 0.18, -0.14, 0.15),
  ];
  legs.forEach((l) => group.add(l));

  // 尾巴:不翘起,一短串毛球平贴在身后,略微下垂
  const tail = new THREE.Group();
  tail.position.set(0, 0.22, -0.22);
  for (let i = 0; i < 3; i++) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.055 - i * 0.012, 5, 4), i === 0 ? fur : mane);
    ball.position.set(0, -i * 0.015, -i * 0.07);
    ball.castShadow = true;
    tail.add(ball);
  }
  group.add(tail);

  return { group, legs, head: headPivot, tail, body };
}
