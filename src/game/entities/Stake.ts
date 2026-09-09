import * as THREE from 'three';
import { clayMaterial } from '../world/ClayMaterial';


/** 程序化拼装的拴羊桩:斜切面的短木桩敲进地里,桩顶绕一圈绳结 */
function makeStakeMesh(): THREE.Group {
  const g = new THREE.Group();
  const wood = clayMaterial('#8a6239');
  // 桩身:下粗上细的短柱,顶部斜切
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.55, 5), wood);
  post.position.y = 0.26;
  post.rotation.z = 0.06;
  post.castShadow = true;
  g.add(post);
  // 斜切面的小顶盖
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.05, 0.05, 5), clayMaterial('#a97b48'));
  cap.position.set(0.016, 0.54, 0);
  cap.rotation.z = 0.06;
  g.add(cap);
  // 桩顶系着的绳圈(绳子另一头连到羊身上,由 LeashLines 实时渲染)
  const knot = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.022, 4, 8), clayMaterial('#c9b588'));
  knot.position.set(0.016, 0.5, 0);
  knot.rotation.x = Math.PI / 2;
  g.add(knot);
  // 敲进土里的基部小土包
  const mound = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 4), clayMaterial('#7a6a4d'));
  mound.scale.y = 0.4;
  g.add(mound);
  return g;
}

/** 场景中的拴羊桩:牵着羊点击工具按钮在脚下敲下,把羊拴在绳长范围内 */
export class Stake {
  readonly group: THREE.Group;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.position.y -= 0.02;
    scene.add(this.group);
    this.group.add(makeStakeMesh());
  }
}

/** 拴羊桩存档(落点) */
export type StakeSave = { id?: string; x: number; y: number; z: number };
