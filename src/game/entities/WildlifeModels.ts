import * as THREE from 'three';

function clay(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 四足动物模型的动画部件:腿根在髋部(绕 X 轴摆动),头颈可点动;eyes 供熊暴怒变红眼 */
export type AnimalModel = {
  group: THREE.Group;
  legs: THREE.Object3D[];
  head: THREE.Object3D;
  tail: THREE.Object3D;
  eyes?: THREE.Mesh[];
  rabbitRig?: {
    body: THREE.Object3D;
    ears: THREE.Object3D[];
    frontPaws: THREE.Object3D[];
    hindLegs: THREE.Object3D[];
  };
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

/** 兔子:梨形躯干、饱满后胯、短前爪、长脚掌和可随跳跃摆动的长耳 */
function makeRabbitModel(): AnimalModel {
  const group = new THREE.Group();
  group.scale.setScalar(0.6);
  const fur = clay('#a9937f');
  const lightFur = clay('#d9cbb9');
  const innerEar = clay('#c98f8e');
  const dark = clay('#302925');
  const noseMat = clay('#8d6260');

  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.3;
  group.add(bodyPivot);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.23, 8, 6), fur);
  body.scale.set(0.92, 0.92, 1.35);
  body.rotation.x = -0.12;
  body.castShadow = true;
  bodyPivot.add(body);

  // 兔子的轮廓重点是高而圆的后胯，而不是均匀的椭圆身体。
  const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 6), fur);
  haunch.scale.set(1.08, 1.08, 1.12);
  haunch.position.set(0, 0.03, -0.18);
  haunch.castShadow = true;
  bodyPivot.add(haunch);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 6), lightFur);
  chest.scale.set(0.78, 1, 0.55);
  chest.position.set(0, -0.03, 0.2);
  bodyPivot.add(chest);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.46, 0.2);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), fur);
  head.scale.set(0.92, 1.02, 1.06);
  head.castShadow = true;
  headPivot.add(head);
  const ears: THREE.Object3D[] = [];
  for (const side of [-1, 1]) {
    const earPivot = new THREE.Group();
    earPivot.position.set(side * 0.065, 0.105, -0.015);
    earPivot.rotation.z = side * -0.1;
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 5), fur);
    ear.scale.set(0.55, 2.15, 0.3);
    ear.position.y = 0.14;
    ear.castShadow = true;
    earPivot.add(ear);
    const pink = new THREE.Mesh(new THREE.SphereGeometry(0.057, 6, 5), innerEar);
    pink.scale.set(0.5, 1.85, 0.18);
    pink.position.set(0, 0.145, 0.022);
    earPivot.add(pink);
    headPivot.add(earPivot);
    ears.push(earPivot);
  }

  // 双颊和短吻让正面、侧面都能读出兔脸。
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.067, 6, 5), lightFur);
    cheek.scale.set(1, 0.78, 1.05);
    cheek.position.set(side * 0.045, -0.045, 0.125);
    headPivot.add(cheek);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.027, 6, 5), dark);
    eye.position.set(side * 0.105, 0.025, 0.095);
    headPivot.add(eye);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 4), noseMat);
  nose.scale.set(1.15, 0.75, 0.8);
  nose.position.set(0, -0.035, 0.188);
  headPivot.add(nose);
  group.add(headPivot);

  const frontPaws: THREE.Object3D[] = [];
  const hindLegs: THREE.Object3D[] = [];
  for (const side of [-1, 1]) {
    const front = new THREE.Group();
    front.position.set(side * 0.095, 0.27, 0.17);
    const foreleg = makeLeg(lightFur, 0, 0, 0, 0.2, 0.72);
    front.add(foreleg);
    const forefoot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 4), lightFur);
    forefoot.scale.set(0.75, 0.48, 1.45);
    forefoot.position.set(0, -0.19, 0.035);
    front.add(forefoot);
    group.add(front);
    frontPaws.push(front);

    const hind = new THREE.Group();
    hind.position.set(side * 0.13, 0.31, -0.15);
    const thigh = new THREE.Mesh(new THREE.SphereGeometry(0.115, 7, 5), fur);
    thigh.scale.set(0.8, 1.05, 1.15);
    thigh.position.set(0, -0.04, -0.025);
    thigh.castShadow = true;
    hind.add(thigh);
    const hindFoot = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 4), lightFur);
    hindFoot.scale.set(0.78, 0.52, 1.75);
    hindFoot.position.set(0, -0.19, 0.035);
    hind.add(hindFoot);
    group.add(hind);
    hindLegs.push(hind);
  }
  const legs = [...frontPaws, ...hindLegs];

  // 绒球尾
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 6), lightFur);
  tail.scale.set(1, 1.05, 0.9);
  tail.position.set(0, 0.37, -0.36);
  group.add(tail);

  return {
    group,
    legs,
    head: headPivot,
    tail,
    rabbitRig: { body: bodyPivot, ears, frontPaws, hindLegs },
  };
}

/** 狼:低伏的灰色躯干、楔形长吻、尖耳、蓬松尾和修长四肢 */
function makeWolfModel(): AnimalModel {
  const group = new THREE.Group();
  const coat = clay('#6f746f');
  const darkCoat = clay('#4c514e');
  const lightCoat = clay('#b8b3a8');
  const dark = clay('#242724');
  const tooth = clay('#eee8d8');

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 7, 6), coat);
  body.scale.set(0.82, 0.78, 1.48);
  body.position.set(0, 0.48, -0.02);
  body.castShadow = true;
  group.add(body);

  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 5), darkCoat);
  shoulders.scale.set(0.9, 1.08, 0.82);
  shoulders.position.set(0, 0.57, 0.25);
  shoulders.castShadow = true;
  group.add(shoulders);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.66, 0.39);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 6), coat);
  head.scale.set(0.9, 0.92, 1.12);
  head.castShadow = true;
  headPivot.add(head);
  const muzzle = new THREE.Mesh(new THREE.ConeGeometry(0.115, 0.28, 5), lightCoat);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, -0.045, 0.22);
  headPivot.add(muzzle);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), dark);
  nose.scale.set(1.15, 0.8, 0.8);
  nose.position.set(0, -0.045, 0.365);
  headPivot.add(nose);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.2, 4), darkCoat);
    ear.position.set(side * 0.105, 0.19, -0.015);
    ear.rotation.z = side * -0.12;
    headPivot.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 5, 4), dark);
    eye.position.set(side * 0.12, 0.045, 0.13);
    headPivot.add(eye);
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.055, 4), tooth);
    fang.position.set(side * 0.055, -0.115, 0.245);
    fang.rotation.x = Math.PI;
    headPivot.add(fang);
  }
  group.add(headPivot);

  const legs = [
    makeLeg(darkCoat, -0.14, 0.43, 0.24, 0.43, 0.72),
    makeLeg(darkCoat, 0.14, 0.43, 0.24, 0.43, 0.72),
    makeLeg(coat, -0.14, 0.43, -0.25, 0.43, 0.76),
    makeLeg(coat, 0.14, 0.43, -0.25, 0.43, 0.76),
  ];
  legs.forEach((leg) => group.add(leg));

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.55, -0.42);
  tailPivot.rotation.x = -0.65;
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 6), darkCoat);
  tail.rotation.x = -Math.PI / 2;
  tail.position.z = -0.18;
  tail.castShadow = true;
  tailPivot.add(tail);
  group.add(tailPivot);

  return { group, legs, head: headPivot, tail: tailPivot };
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
  wolf: makeWolfModel,
  bear: makeBearModel,
} as const;
