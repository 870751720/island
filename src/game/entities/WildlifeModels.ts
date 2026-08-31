import * as THREE from 'three';

function clay(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 四足动物模型的动画部件:腿根在髋部(绕 X 轴摆动),头颈可点动;eyes 供熊暴怒变红眼 */
export type AnimalModel = {
  group: THREE.Group;
  legs: THREE.Mesh[];
  head: THREE.Object3D;
  tail: THREE.Object3D;
  eyes?: THREE.Mesh[];
};

/** 一条腿:锥形杆从髋部垂下,根部落在一端以便摆动;thickness 调整粗细(鹿等纤腿动物 < 1) */
function makeLeg(
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  len: number,
  thickness = 1
): THREE.Mesh {
  const leg = new THREE.Mesh(
    new THREE.CylinderGeometry(len * 0.22 * thickness, len * 0.3 * thickness, len, 4),
    mat
  );
  leg.geometry.translate(0, -len / 2, 0);
  leg.position.set(x, y, z);
  leg.castShadow = true;
  return leg;
}

/** 兔子:圆润的浅灰身躯 + 长耳朵 + 白色绒球尾,后腿粗壮 */
function makeRabbitModel(): AnimalModel {
  const group = new THREE.Group();
  const fur = clay('#b8ada0');
  const belly = clay('#d9d2c7');
  const dark = clay('#4a423c');

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 6), fur);
  body.scale.set(0.9, 0.95, 1.25);
  body.position.y = 0.26;
  body.castShadow = true;
  group.add(body);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.42, 0.22);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 6), fur);
  head.scale.set(0.9, 0.95, 1.1);
  head.castShadow = true;
  headPivot.add(head);
  // 长耳朵:两片竖起的扁盒
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.03), fur);
    ear.position.set(side * 0.06, 0.17, -0.02);
    ear.rotation.x = -0.15;
    headPivot.add(ear);
  }
  // 鼻尖与眼睛
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), dark);
  nose.position.set(0, -0.01, 0.15);
  headPivot.add(nose);
  group.add(headPivot);

  // 短前腿 + 粗后腿
  const legs = [
    makeLeg(belly, -0.1, 0.24, 0.16, 0.24),
    makeLeg(belly, 0.1, 0.24, 0.16, 0.24),
    makeLeg(fur, -0.11, 0.26, -0.16, 0.26),
    makeLeg(fur, 0.11, 0.26, -0.16, 0.26),
  ];
  legs.forEach((l) => group.add(l));

  // 绒球尾
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), belly);
  tail.position.set(0, 0.3, -0.28);
  group.add(tail);

  return { group, legs, head: headPivot, tail };
}

/** 绵羊:奶白色蓬松羊毛身 + 深色小脸和细腿 */
function makeSheepModel(): AnimalModel {
  const group = new THREE.Group();
  const wool = clay('#e8e2d4');
  const skin = clay('#5a4f46');

  // 蓬松羊毛:主团 + 几个鼓包
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 7, 6), wool);
  body.scale.set(1, 0.95, 1.4);
  body.position.y = 0.46;
  body.castShadow = true;
  group.add(body);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const bump = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), wool);
    bump.position.set(Math.cos(a) * 0.2, 0.58, Math.sin(a) * 0.3);
    group.add(bump);
  }

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.56, 0.4);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), skin);
  head.scale.set(0.85, 1, 1.15);
  head.castShadow = true;
  headPivot.add(head);
  // 垂耳 + 头顶羊毛帘
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.06), skin);
    ear.position.set(side * 0.13, 0.02, 0);
    ear.rotation.z = side * 0.5;
    headPivot.add(ear);
  }
  const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), wool);
  fringe.scale.set(0.95, 0.55, 0.9);
  fringe.position.set(0, 0.09, -0.03);
  headPivot.add(fringe);
  group.add(headPivot);

  const legs = [
    makeLeg(skin, -0.13, 0.4, 0.2, 0.4),
    makeLeg(skin, 0.13, 0.4, 0.2, 0.4),
    makeLeg(skin, -0.13, 0.4, -0.2, 0.4),
    makeLeg(skin, 0.13, 0.4, -0.2, 0.4),
  ];
  legs.forEach((l) => group.add(l));

  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), wool);
  tail.position.set(0, 0.5, -0.44);
  group.add(tail);

  return { group, legs, head: headPivot, tail };
}

/** 鹿:纤长的浅棕身躯 + 长颈 + 分叉鹿角与白尾 */
function makeDeerModel(): AnimalModel {
  const group = new THREE.Group();
  const coat = clay('#b98a5e');
  const light = clay('#d9b98c');
  const horn = clay('#8a7455');

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 7, 6), coat);
  body.scale.set(0.9, 1, 1.5);
  body.position.y = 0.68;
  body.castShadow = true;
  group.add(body);

  // 长颈从身前上方伸出,顶端接头
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.82, 0.34);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.42, 5), coat);
  neck.geometry.translate(0, 0.21, 0);
  neck.rotation.x = 0.5;
  neck.castShadow = true;
  headPivot.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), coat);
  head.scale.set(0.95, 1, 1.5);
  head.position.set(0, 0.38, 0.2);
  head.castShadow = true;
  headPivot.add(head);
  // 鹿角:两根主枝各带一根分叉
  for (const side of [-1, 1]) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.3, 4), horn);
    beam.geometry.translate(0, 0.15, 0);
    beam.position.set(side * 0.06, 0.46, 0.15);
    beam.rotation.z = side * 0.5;
    headPivot.add(beam);
    const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.16, 4), horn);
    tine.geometry.translate(0, 0.08, 0);
    tine.position.set(side * 0.16, 0.55, 0.15);
    tine.rotation.z = side * 1.1;
    headPivot.add(tine);
  }
  group.add(headPivot);

  // 纤细长腿
  const legs = [
    makeLeg(coat, -0.12, 0.62, 0.26, 0.62, 0.55),
    makeLeg(coat, 0.12, 0.62, 0.26, 0.62, 0.55),
    makeLeg(coat, -0.12, 0.62, -0.26, 0.62, 0.55),
    makeLeg(coat, 0.12, 0.62, -0.26, 0.62, 0.55),
  ];
  legs.forEach((l) => group.add(l));

  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), light);
  tail.position.set(0, 0.78, -0.42);
  group.add(tail);

  return { group, legs, head: headPivot, tail };
}

/** 熊:深棕色敦实大身板 + 圆耳短吻 + 粗壮四肢 */
function makeBearModel(): AnimalModel {
  const group = new THREE.Group();
  const fur = clay('#6b4a33');
  const muzzle = clay('#a3806a');
  const dark = clay('#2a2018');

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), fur);
  body.scale.set(1, 0.95, 1.35);
  body.position.y = 0.62;
  body.castShadow = true;
  group.add(body);
  // 背上的肩峰
  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 5), fur);
  hump.position.set(0, 0.88, 0.18);
  group.add(hump);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.86, 0.48);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 6), fur);
  head.castShadow = true;
  headPivot.add(head);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), muzzle);
  snout.scale.set(1, 0.8, 1.2);
  snout.position.set(0, -0.04, 0.19);
  headPivot.add(snout);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), dark);
  nose.position.set(0, 0, 0.29);
  headPivot.add(nose);
  const eyes: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), fur);
    ear.position.set(side * 0.15, 0.18, 0);
    headPivot.add(ear);
    // 独立材质的眼睛:暴怒时整副换成红色发光
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), clay('#2a2018'));
    eye.position.set(side * 0.12, 0.06, 0.17);
    headPivot.add(eye);
    eyes.push(eye);
  }
  group.add(headPivot);

  // 粗壮四肢
  const legs = [
    makeLeg(fur, -0.22, 0.56, 0.3, 0.56),
    makeLeg(fur, 0.22, 0.56, 0.3, 0.56),
    makeLeg(fur, -0.22, 0.56, -0.32, 0.56),
    makeLeg(fur, 0.22, 0.56, -0.32, 0.56),
  ];
  legs.forEach((l) => group.add(l));

  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), fur);
  tail.position.set(0, 0.62, -0.58);
  group.add(tail);

  return { group, legs, head: headPivot, tail, eyes };
}

export const ANIMAL_BUILDERS = {
  rabbit: makeRabbitModel,
  sheep: makeSheepModel,
  deer: makeDeerModel,
  bear: makeBearModel,
} as const;
