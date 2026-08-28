import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import { IslandTerrain } from './IslandTerrain';

export type PropKind = 'tree' | 'rock' | 'gravel' | 'berry' | 'shrub';

/** 各类资源点的采集产出与再生时间(秒);regrow 为 0 表示不可再生 */
const PROP_CONFIG: Record<PropKind, { regrow: number }> = {
  tree: { regrow: 0 },
  rock: { regrow: 0 },
  gravel: { regrow: 0 },
  berry: { regrow: 60 },
  shrub: { regrow: 90 },
};

export type Prop = {
  kind: PropKind;
  group: THREE.Group;
  position: THREE.Vector3;
  ready: boolean;
  regrowLeft: number;
};

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 1,
  });
}

function makeTree(): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 0.9, 5),
    clayMaterial('#8a6239')
  );
  trunk.position.y = 0.45;
  const crown = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.65, 0),
    clayMaterial('#3f7d33')
  );
  crown.position.y = 1.2;
  const crown2 = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 0),
    clayMaterial('#4f9440')
  );
  crown2.position.set(0.15, 1.65, 0.1);
  for (const m of [trunk, crown, crown2]) {
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

function makeRock(): THREE.Group {
  const g = new THREE.Group();
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.55, 0),
    clayMaterial('#8a8a8a')
  );
  rock.scale.set(1, 0.85, 0.9);
  rock.position.y = 0.4;
  rock.castShadow = true;
  g.add(rock);
  return g;
}

function makeGravel(): THREE.Group {
  const g = new THREE.Group();
  const mat = clayMaterial('#b5b0a8');
  for (let i = 0; i < 4; i++) {
    const pebble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), mat);
    pebble.position.set(
      Math.cos((i / 4) * Math.PI * 2) * 0.25,
      0.1,
      Math.sin((i / 4) * Math.PI * 2) * 0.25
    );
    pebble.castShadow = true;
    g.add(pebble);
  }
  return g;
}

function makeBushBody(color: string): { group: THREE.Group; body: THREE.Mesh } {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), clayMaterial(color));
  body.position.y = 0.28;
  body.castShadow = true;
  group.add(body);
  return { group, body };
}

function makeBerryBush(): { group: THREE.Group; berries: THREE.Mesh[] } {
  const { group } = makeBushBody('#5d8a3a');
  const berryMat = clayMaterial('#c0392b');
  const berries: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const berry = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), berryMat);
    const a = (i / 4) * Math.PI * 2;
    berry.position.set(Math.cos(a) * 0.28, 0.38, Math.sin(a) * 0.28);
    berries.push(berry);
    group.add(berry);
  }
  return { group, berries };
}

function makeShrub(): THREE.Group {
  // 灌木丛:多团叶子,产出树枝
  const g = new THREE.Group();
  const mat = clayMaterial('#6b8f4e');
  for (let i = 0; i < 3; i++) {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), mat);
    const a = (i / 3) * Math.PI * 2;
    blob.position.set(Math.cos(a) * 0.18, 0.2 + (i % 2) * 0.1, Math.sin(a) * 0.18);
    blob.castShadow = true;
    g.add(blob);
  }
  return g;
}

/** 岛上散布的资源点,管理采集后的外观变化与再生 */
export class Props implements Updatable {
  readonly list: Prop[] = [];
  private berries = new Map<Prop, THREE.Mesh[]>();

  constructor(
    scene: THREE.Scene,
    terrain: IslandTerrain,
    rng: () => number = Math.random
  ) {
    const half = terrain.size / 2;
    const spawn = (kind: PropKind, count: number) => {
      for (let i = 0; i < count; i++) {
        let x = 0;
        let z = 0;
        let y = -1;
        for (let tries = 0; tries < 20; tries++) {
          x = (rng() * 2 - 1) * half * 0.85;
          z = (rng() * 2 - 1) * half * 0.85;
          y = terrain.getHeight(x, z);
          if (y > 0.3) break;
        }
        if (y <= 0.3) continue;
        let berries: THREE.Mesh[] | null = null;
        let group: THREE.Group;
        if (kind === 'tree') group = makeTree();
        else if (kind === 'rock') group = makeRock();
        else if (kind === 'gravel') group = makeGravel();
        else if (kind === 'shrub') group = makeShrub();
        else {
          const made = makeBerryBush();
          group = made.group;
          berries = made.berries;
        }
        group.position.set(x, y - 0.05, z);
        group.rotation.y = rng() * Math.PI * 2;
        scene.add(group);
        const prop: Prop = {
          kind,
          group,
          position: group.position.clone(),
          ready: true,
          regrowLeft: 0,
        };
        this.list.push(prop);
        if (berries) this.berries.set(prop, berries);
      }
    };
    spawn('tree', 60);
    spawn('rock', 18);
    spawn('gravel', 32);
    spawn('berry', 20);
    spawn('shrub', 30);
  }

  /** 采集后的外观变化,并按配置安排再生 */
  harvest(prop: Prop): void {
    prop.ready = false;
    const { regrow } = PROP_CONFIG[prop.kind];
    if (regrow > 0) {
      prop.regrowLeft = regrow;
    }
    switch (prop.kind) {
      case 'tree':
        // 砍掉树冠只留树桩
        prop.group.children
          .filter((c) => c instanceof THREE.Mesh)
          .slice(1)
          .forEach((c) => (c.visible = false));
        break;
      case 'rock':
      case 'gravel':
        prop.group.visible = false;
        break;
      case 'berry':
        // 浆果丛保留,只藏起果子
        for (const berry of this.berries.get(prop) ?? []) berry.visible = false;
        break;
      case 'shrub':
        // 灌木丛被割,缩到很小的桩
        prop.group.scale.setScalar(0.35);
        break;
    }
  }

  update(delta: number): void {
    for (const prop of this.list) {
      if (prop.ready || prop.regrowLeft <= 0) continue;
      prop.regrowLeft -= delta;
      if (prop.regrowLeft > 0) continue;
      prop.ready = true;
      prop.regrowLeft = 0;
      if (prop.kind === 'berry') {
        for (const berry of this.berries.get(prop) ?? []) berry.visible = true;
      } else if (prop.kind === 'shrub') {
        prop.group.scale.setScalar(1);
      }
    }
  }
}
