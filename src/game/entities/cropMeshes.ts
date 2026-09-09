import * as THREE from 'three';
import type { CropKind, CropStage } from './Crop';

/** 生长阶段建模工厂:每种作物一条,按幼苗/未成熟/成熟返回一垄植株 */
export type CropMeshMaker = (stage: CropStage, x: number, z: number) => THREE.Group;

function cropMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 按落点取 0-1 的确定性伪随机(与土壤的土坷垃同款,读档/联机重放不漂移) */
function cellRandom(x: number, z: number, i: number): number {
  const v = Math.sin(x * 127.1 + z * 311.7 + i * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

/** 一片叶片:绕自身倾斜的扁片,从根部散开 */
function leaf(color: string, len: number, tilt: number, rotY: number): THREE.Group {
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.035, len, 4), cropMaterial(color));
  m.position.y = len / 2;
  m.rotation.z = tilt;
  const pivot = new THREE.Group();
  pivot.rotation.y = rotY;
  pivot.add(m);
  return pivot;
}

/** 沿三道土垄各摆一丛植株,坐标按落点伪随机散布(与土壤质感呼应) */
function plantSpots(x: number, z: number): THREE.Vector3[] {
  const spots: THREE.Vector3[] = [];
  for (let i = 0; i < 3; i++) {
    spots.push(
      new THREE.Vector3(cellRandom(x, z, i) * 0.3 - 0.15, 0.1, -1 / 3 + i / 3 + cellRandom(x, z, i + 3) * 0.08 - 0.04)
    );
  }
  return spots;
}

/** 把三垄植株摆到垄位上 */
function bedOf(x: number, z: number, makePlant: () => THREE.Group): THREE.Group {
  const g = new THREE.Group();
  for (const spot of plantSpots(x, z)) {
    const plant = makePlant();
    plant.position.copy(spot);
    g.add(plant);
  }
  return g;
}

// —— 胡萝卜:叶片丛,成熟时橙色根茎顶出土面 ——
function makeCarrotMesh(stage: CropStage, x: number, z: number): THREE.Group {
  const leafColor = stage === 2 ? '#4a8a35' : '#5da345';
  return bedOf(x, z, () => {
    const plant = new THREE.Group();
    if (stage === 0) {
      plant.add(leaf(leafColor, 0.14, 0.35, 0), leaf(leafColor, 0.12, -0.3, 2.2));
    } else {
      const count = stage === 1 ? 4 : 6;
      const len = stage === 1 ? 0.22 : 0.3;
      for (let i = 0; i < count; i++) {
        plant.add(leaf(leafColor, len + cellRandom(x, z, i) * 0.06, 0.5 + (i % 3) * 0.15, (i / count) * Math.PI * 2));
      }
      if (stage === 2) {
        const root = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.12, 6), cropMaterial('#e07b2a'));
        root.position.y = 0.04;
        plant.add(root);
      }
    }
    return plant;
  });
}

// —— 小麦:细秆,成熟换饱满麦穗 ——
function makeWheatMesh(stage: CropStage, x: number, z: number): THREE.Group {
  const stalkColor = stage === 2 ? '#d9b45a' : '#7aa74e';
  return bedOf(x, z, () => {
    const plant = new THREE.Group();
    const count = stage === 0 ? 2 : stage === 1 ? 4 : 5;
    const len = stage === 0 ? 0.16 : stage === 1 ? 0.38 : 0.55;
    for (let i = 0; i < count; i++) {
      const stalk = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, len, 5), cropMaterial(stalkColor));
      stem.position.y = len / 2;
      stalk.add(stem);
      stalk.rotation.z = 0.08 + cellRandom(x, z, i) * 0.12;
      stalk.rotation.y = (i / count) * Math.PI * 2;
      if (stage === 1) {
        stalk.add(leaf('#7aa74e', 0.2, 0.55, 0.8));
      } else if (stage === 2) {
        const head = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 5), cropMaterial('#e8c56a'));
        head.position.y = len + 0.06;
        stalk.add(head);
        const awn = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.1, 3), cropMaterial('#c9a441'));
        awn.position.y = len + 0.16;
        stalk.add(awn);
      }
      plant.add(stalk);
    }
    return plant;
  });
}

/** 块茎类通用建模:叶丛随阶段变大,成熟时顶出土面的块茎;color 为地上叶色,tuber 为块茎配色 */
function makeTuberMesh(stage: CropStage, x: number, z: number, leafColor: string, tuberColor: string): THREE.Group {
  return bedOf(x, z, () => {
    const plant = new THREE.Group();
    if (stage === 0) {
      plant.add(leaf(leafColor, 0.13, 0.4, 0), leaf(leafColor, 0.13, -0.4, 1.6), leaf(leafColor, 0.11, 0.1, 3));
    } else {
      const count = stage === 1 ? 5 : 7;
      const len = stage === 1 ? 0.2 : 0.28;
      for (let i = 0; i < count; i++) {
        plant.add(leaf(leafColor, len + cellRandom(x, z, i) * 0.05, 0.45 + (i % 3) * 0.15, (i / count) * Math.PI * 2));
      }
      if (stage === 2) {
        const tuber = new THREE.Mesh(new THREE.IcosahedronGeometry(0.055, 0), cropMaterial(tuberColor));
        tuber.position.y = 0.03;
        tuber.scale.set(1.2, 0.8, 1);
        plant.add(tuber);
      }
    }
    return plant;
  });
}

/** 果菜类通用建模:主茎 + 分枝,成熟时挂果;fruit 为挂件 mesh 工厂 */
function makeFruitBushMesh(
  stage: CropStage,
  x: number,
  z: number,
  stemColor: string,
  fruit: () => THREE.Object3D,
  fruitCount = 3
): THREE.Group {
  return bedOf(x, z, () => {
    const plant = new THREE.Group();
    const len = stage === 0 ? 0.12 : stage === 1 ? 0.3 : 0.42;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, len, 5), cropMaterial(stemColor));
    stem.position.y = len / 2;
    stem.rotation.z = 0.06;
    plant.add(stem);
    if (stage === 0) return plant;
    const branches = stage === 1 ? 2 : 4;
    for (let i = 0; i < branches; i++) {
      plant.add(leaf(stage === 1 ? '#6aa74e' : '#4f8a3d', len * 0.55, 0.7, (i / branches) * Math.PI * 2 + cellRandom(x, z, i)));
    }
    if (stage === 2) {
      for (let i = 0; i < fruitCount; i++) {
        const f = fruit();
        const a = (i / fruitCount) * Math.PI * 2;
        f.position.set(Math.cos(a) * 0.09, len * (0.45 + (i % 2) * 0.3), Math.sin(a) * 0.09);
        plant.add(f);
      }
    }
    return plant;
  });
}

/** 高秆作物建模:玉米类,粗秆 + 长叶,成熟时腰部结穗 */
function makeCornMesh(stage: CropStage, x: number, z: number): THREE.Group {
  return bedOf(x, z, () => {
    const plant = new THREE.Group();
    const len = stage === 0 ? 0.15 : stage === 1 ? 0.5 : 0.85;
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, len, 5), cropMaterial(stage === 2 ? '#8a9a4a' : '#5da345'));
    stalk.position.y = len / 2;
    plant.add(stalk);
    const leaves = stage === 0 ? 2 : stage === 1 ? 3 : 5;
    for (let i = 0; i < leaves; i++) {
      const l = leaf('#5da345', len * 0.5, 0.8, (i / leaves) * Math.PI * 2);
      l.position.y = len * (0.35 + (i % 3) * 0.2);
      plant.add(l);
    }
    if (stage === 2) {
      const cob = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 6), cropMaterial('#e8c56a'));
      cob.position.set(0.07, len * 0.55, 0);
      cob.rotation.z = 0.35;
      plant.add(cob);
      const husk = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), cropMaterial('#6aa74e'));
      husk.position.set(0.07, len * 0.55 + 0.13, 0);
      plant.add(husk);
      const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 4), cropMaterial('#c9a441'));
      tassel.position.y = len + 0.05;
      plant.add(tassel);
    }
    return plant;
  });
}

/** 豆类建模:矮丛多分枝,成熟时挂满小豆荚 */
function makeSoybeanMesh(stage: CropStage, x: number, z: number): THREE.Group {
  return bedOf(x, z, () => {
    const plant = new THREE.Group();
    const leafColor = stage === 2 ? '#5a8a3a' : '#6aa74e';
    const count = stage === 0 ? 2 : stage === 1 ? 4 : 6;
    const len = stage === 0 ? 0.13 : stage === 1 ? 0.26 : 0.36;
    for (let i = 0; i < count; i++) {
      plant.add(leaf(leafColor, len + cellRandom(x, z, i) * 0.05, 0.4 + (i % 3) * 0.14, (i / count) * Math.PI * 2));
    }
    if (stage === 2) {
      const podMat = cropMaterial('#9aa74e');
      for (let i = 0; i < 4; i++) {
        const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.08, 2, 5), podMat);
        const a = (i / 4) * Math.PI * 2 + cellRandom(x, z, i);
        pod.position.set(Math.cos(a) * 0.08, 0.12 + (i % 2) * 0.12, Math.sin(a) * 0.08);
        pod.rotation.z = 0.5;
        plant.add(pod);
      }
    }
    return plant;
  });
}

/** 结球叶菜建模:卷心菜,层层抱拢的球头随阶段膨大 */
function makeCabbageMesh(stage: CropStage, x: number, z: number): THREE.Group {
  return bedOf(x, z, () => {
    const plant = new THREE.Group();
    if (stage === 0) {
      plant.add(leaf('#7cb36a', 0.12, 0.5, 0), leaf('#7cb36a', 0.12, 0.5, 2.1), leaf('#7cb36a', 0.1, 0.5, 4.2));
    } else {
      const r = stage === 1 ? 0.09 : 0.15;
      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), cropMaterial('#8fc47a'));
      head.position.y = r * 0.75;
      head.scale.y = 0.85;
      plant.add(head);
      for (let i = 0; i < 4; i++) {
        plant.add(leaf('#6aa74e', r * 1.6, 0.75, (i / 4) * Math.PI * 2 + cellRandom(x, z, i)));
      }
    }
    return plant;
  });
}

/** 藤蔓作物建模:南瓜,蔓生的藤 + 成熟时的大果 */
function makePumpkinMesh(stage: CropStage, x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const vineMat = cropMaterial('#5a8a3a');
  const spots = plantSpots(x, z);
  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i];
    const plant = new THREE.Group();
    plant.position.copy(spot);
    if (stage === 0) {
      plant.add(leaf('#6aa74e', 0.12, 0.45, i), leaf('#6aa74e', 0.1, -0.5, i + 2));
    } else {
      const len = stage === 1 ? 0.3 : 0.5;
      const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, len, 4), vineMat);
      vine.position.y = len / 2;
      vine.rotation.z = 0.35 * (i % 2 ? 1 : -1);
      plant.add(vine);
      plant.add(leaf('#5a8a3a', len * 0.7, 0.85, i));
      if (stage === 2 && i === 0) {
        // 全垄只结一个大南瓜,压在垄边
        const pumpkin = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), cropMaterial('#e0862a'));
        pumpkin.position.set(0.14, 0.15, 0.05);
        pumpkin.scale.set(1, 0.8, 1);
        plant.add(pumpkin);
        const stem2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.07, 4), cropMaterial('#7a6a3a'));
        stem2.position.set(0.14, 0.3, 0.05);
        plant.add(stem2);
      }
    }
    g.add(plant);
  }
  return g;
}

/** 各种作物的建模工厂(播种预览/手持模型共用幼苗阶段) */
export const CROP_MESH_MAKERS: Record<CropKind, CropMeshMaker> = {
  carrot: makeCarrotMesh,
  wheat: makeWheatMesh,
  potato: (s, x, z) => makeTuberMesh(s, x, z, '#5d9a45', '#c9a06a'),
  sweetPotato: (s, x, z) => makeTuberMesh(s, x, z, '#4a8a50', '#c96a3a'),
  corn: makeCornMesh,
  soybean: makeSoybeanMesh,
  tomato: (s, x, z) =>
    makeFruitBushMesh(s, x, z, '#5a8a3d', () => new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), cropMaterial('#d94a3a'))),
  pepper: (s, x, z) =>
    makeFruitBushMesh(
      s,
      x,
      z,
      '#4f8a3d',
      () => {
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.1, 5), cropMaterial('#d93a2a'));
        f.rotation.z = Math.PI;
        return f;
      },
      4
    ),
  eggplant: (s, x, z) =>
    makeFruitBushMesh(
      s,
      x,
      z,
      '#5a8a3d',
      () => {
        const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.08, 2, 5), cropMaterial('#6a3a8a'));
        f.rotation.z = 0.4;
        return f;
      },
      3
    ),
  strawberry: (s, x, z) =>
    makeFruitBushMesh(
      s,
      x,
      z,
      '#5a8a3d',
      () => new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 5), cropMaterial('#d93a4a')),
      4
    ),
  cabbage: makeCabbageMesh,
  pumpkin: makePumpkinMesh,
};
