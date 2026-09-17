import * as THREE from 'three';

import type { CompanionModel } from './CompanionModel';
import { mergeClayMeshes } from '../core/mergeClayMeshes';

/** 可乐 A：灰白圆脸、金眼睛、白鼻梁与不对称嘴边花纹。 */
export function makeColaModel(): CompanionModel {
  const v = { head: .43, body: .43, length: .68, leg: .34, eyes: .077, segments: 12 };
  const root = new THREE.Group();
  const coat = new THREE.Group(); root.add(coat);
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const mat = (color: string) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({color, roughness: 1, flatShading: true}));
    return materials.get(color)!;
  };
  const white = '#eee9dd', gray = '#686c70', dark = '#313537';
  function ball(parent: THREE.Object3D, color: string, pos: number[], scale: number[]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, v.segments, 8), mat(color));
    m.position.set(pos[0], pos[1], pos[2]); m.scale.set(scale[0], scale[1], scale[2]);
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  const bodyY = v.leg + .24;
  ball(coat, white, [0, bodyY, -.08], [v.body, v.body, v.length]);
  // Large grey saddle and rump, separated by a visible white band.
  ball(coat, gray, [-.025, bodyY + .065, -.23], [v.body * 1.015, v.body * .96, v.length * .55]);
  ball(coat, gray, [.01, bodyY + .025, -.57], [v.body * .83, v.body * .85, v.length * .31]);
  ball(coat, white, [.025, bodyY + .09, -.43], [v.body * .99, v.body * .92, .075]);
  const legs: THREE.Group[] = [];
  for (const z of [.28, -.48]) for (const x of [-.25, .25]) {
    const joint = new THREE.Group(); joint.position.set(x, v.leg + .1, z);
    coat.add(joint); legs.push(joint);
    ball(joint, white, [0, -v.leg / 2, 0], [.115, v.leg / 2 + .08, .12]);
    ball(joint, white, [0, -v.leg + .015, .065], [.14, .09, .18]);
  }
  const head = new THREE.Group(); head.position.set(0, bodyY + .24, .43); coat.add(head);
  ball(head, white, [0, 0, 0], [v.head, v.head * .91, v.head * .86]);
  // Grey cap on both sides of the white blaze.
  for (const side of [-1, 1]) {
    ball(head, gray, [side * v.head * .43, .12, .02], [v.head * .57, v.head * .68, v.head * .85]);
    const ear = new THREE.Mesh(new THREE.ConeGeometry(v.head * .31, v.head * .66, 4), mat(gray));
    ear.position.set(side * v.head * .67, v.head * .88, -.025); ear.rotation.z = -side * .19; head.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(v.head * .18, v.head * .4, 3), mat('#b88788'));
    inner.position.set(side * v.head * .68, v.head * .87, v.head * .16); inner.rotation.z = -side * .19; head.add(inner);
  }
  ball(head, white, [0, -.015, v.head * .65], [v.head * .24, v.head * .75, v.head * .29]);
  for (const side of [-1, 1]) {
    ball(head, white, [side * v.head * .41, -v.head * .29, v.head * .55], [v.head * .53, v.head * .43, v.head * .45]);
    const x = side * v.head * .43, y = .02, z = v.head * .81;
    ball(head, dark, [x, y, z], [v.eyes * 1.17, v.eyes * 1.16, .04]);
    ball(head, '#c8a449', [x, y, z + .026], [v.eyes, v.eyes, .028]);
    ball(head, '#182429', [x, y, z + .049], [v.eyes * .47, v.eyes * .8, .014]);
    ball(head, '#fff9e8', [x - .022, y + .026, z + .062], [.018, .018, .009]);
  }
  // The asymmetric moustache markings are Cola's identifying feature.
  ball(head, gray, [-.052, -.137, v.head * .95], [.064, .038, .018]);
  ball(head, dark, [.065, -.142, v.head * .95], [.052, .034, .018]);
  ball(head, gray, [.18, -.16, v.head * .81], [.08, .06, .025]);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.047, .049, 3), mat('#3d393c'));
  nose.rotation.z = Math.PI; nose.rotation.y = Math.PI; nose.position.set(0, -.092, v.head * 1.035); head.add(nose);
  const tail = new THREE.Group(); tail.position.set(0, bodyY + .04, -.65); coat.add(tail);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.04,.15,-.2),new THREE.Vector3(.09,.47,-.25),new THREE.Vector3(.18,.68,-.2),new THREE.Vector3(.28,.7,-.12)]);
  const tailMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, .068, 5, false), mat(gray)); tailMesh.castShadow = true; tail.add(tailMesh);
  for (const joint of legs) mergeClayMeshes(joint);
  mergeClayMeshes(head);
  mergeClayMeshes(tail);
  mergeClayMeshes(coat, [...legs, head, tail]);
  root.scale.setScalar(.48);
  return { group: root, legs: [], head, tail, body: coat, update(t: number, action: string) {
    const walk = action === 'walk' || action === 'flee', sleep = action === 'sleep';
    const dig = action === 'dig', swim = action === 'swim';
    coat.position.y = sleep ? -.17 : walk ? Math.sin(t * 10) * .018 : Math.sin(t * 2) * .009;
    coat.scale.y = sleep ? .7 : 1;
    head.rotation.x = sleep ? .23 : action === 'groom' ? .3 + Math.sin(t * 5) * .12 : Math.sin(t * 1.5) * .035;
    head.rotation.z = action === 'groom' ? -.18 : Math.sin(t * .8) * .025;
    tail.rotation.z = Math.sin(t * (walk ? 4 : 1.6)) * .13;
    tail.rotation.x = sleep ? -.9 : 0;
    tail.rotation.y = sleep ? 1.35 : 0;
    coat.rotation.x = action === 'stretch' ? .13 : 0;
    coat.rotation.z = action === 'shake' ? Math.sin(t * 32) * .13 : 0;
    if (dig) head.rotation.x = .5;
    if (action === 'sniff') head.rotation.x = .3;
    if (swim) { head.rotation.x = -.2; coat.scale.y = 1; }
    legs.forEach((l, i) => { l.rotation.x = swim ? Math.sin(t * 15 + i * Math.PI * .5) * .75 : dig && i < 2 ? Math.sin(t * 18 + i * Math.PI) * .8 : walk ? Math.sin(t * 9 + (i === 0 || i === 3 ? 0 : Math.PI)) * .48 : sleep ? -1 : action === 'groom' && i === 1 ? -1.6 + Math.sin(t * 5) * .12 : 0; });
  }};
}
