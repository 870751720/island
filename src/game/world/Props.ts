import * as THREE from 'three';
import { IslandTerrain } from './IslandTerrain';

export type PropKind = 'tree' | 'rock' | 'gravel' | 'berry';

export type Prop = {
  kind: PropKind;
  group: THREE.Group;
  position: THREE.Vector3;
  harvested: boolean;
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

function makeBerryBush(): THREE.Group {
  const g = new THREE.Group();
  const bush = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.35, 0),
    clayMaterial('#5d8a3a')
  );
  bush.position.y = 0.28;
  bush.castShadow = true;
  g.add(bush);
  const berryMat = clayMaterial('#c0392b');
  for (let i = 0; i < 4; i++) {
    const berry = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.07, 0),
      berryMat
    );
    const a = (i / 4) * Math.PI * 2;
    berry.position.set(Math.cos(a) * 0.28, 0.38, Math.sin(a) * 0.28);
    g.add(berry);
  }
  return g;
}

export class Props {
  readonly list: Prop[] = [];

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
        const group =
          kind === 'tree'
            ? makeTree()
            : kind === 'rock'
              ? makeRock()
              : kind === 'gravel'
                ? makeGravel()
                : makeBerryBush();
        group.position.set(x, y - 0.05, z);
        group.rotation.y = rng() * Math.PI * 2;
        scene.add(group);
        this.list.push({ kind, group, position: group.position.clone(), harvested: false });
      }
    };
    spawn('tree', 26);
    spawn('rock', 8);
    spawn('gravel', 14);
    spawn('berry', 8);
  }
}
