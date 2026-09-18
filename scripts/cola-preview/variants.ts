import * as THREE from 'three';
import { makeColaModel } from '../../src/game/companions/ColaModel';
import { mergeClayMeshes } from '../../src/game/core/mergeClayMeshes';

export const variants = [
  { name: 'A · 软乎乎圆脸', note: '接近照片：圆脸、灰白背毛、自然身形', head: .48, body: .43, length: .68, leg: .36, eye: .085 },
  { name: 'B · 软萌圆脸', note: '推荐方向：薯条的可爱画风，正常猫腿与明亮圆眼', head: .52, body: .47, length: .64, leg: .36, eye: .097 },
  { name: 'C · 大头甜心', note: '更圆的大头和小耳朵，保留正常猫腿', head: .58, body: .42, length: .62, leg: .36, eye: .108 },
];

export function candidate(index: number) {
  const v = variants[index];
  const model = makeColaModel();
  // Retain the production rig and its action contract; replace only its static geometry.
  for (const node of [model.head, model.tail, model.body]) {
    for (const child of [...node.children]) if (child instanceof THREE.Mesh) {
      child.geometry.dispose(); node.remove(child);
    }
  }
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const white = '#f1ede4', gray = '#62646a', dark = '#292a30';
  function ball(parent: THREE.Object3D, color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }));
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), materials.get(color));
    mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz); parent.add(mesh); return mesh;
  }
  const y = v.leg + .22;
  ball(model.body, white, 0,y,-.08,v.body,.39,v.length);
  ball(model.body, gray, 0,y+.13,-.23,v.body*.97,.29,v.length*.76);
  ball(model.body, white, -.10,y+.26,-.29,.15,.17,.13);
  const joints = model.body.children.filter(c => c instanceof THREE.Group && c !== model.head && c !== model.tail);
  joints.forEach((joint,i) => {
    for(const child of [...joint.children]) { if(child instanceof THREE.Mesh) child.geometry.dispose(); joint.remove(child); }
    joint.position.set(i%2 === 0 ? -.24 : .24,v.leg+.08,i<2 ? .23 : -.40);
    ball(joint,white,0,-v.leg/2,0,.13,v.leg/2+.07,.14);
    ball(joint,white,0,-v.leg+.015,.05,.16,.09,.18);
    mergeClayMeshes(joint as THREE.Group);
  });
  const h=v.head;
  model.head.position.set(0,y+.26,.37);
  ball(model.head,white,0,0,0,h,h*.83,h*.76);
  for(const side of [-1,1]) {
    ball(model.head,gray,side*h*.46,h*.24,-.015,h*.54,h*.61,h*.75);
    const ear = new THREE.Mesh(new THREE.ConeGeometry(h*.24,h*.47,4),materials.get(gray));
    ear.position.set(side*h*.64,h*.77,-.04); ear.rotation.z=-side*.2; model.head.add(ear);
    ball(model.head,'#c19398',side*h*.64,h*.78,h*.09,h*.10,h*.13,.022);
    ball(model.head,white,side*h*.40,-h*.29,h*.48,h*.58,h*.43,h*.43);
    const x=side*h*.43, z=h*.76, e=v.eye;
    ball(model.head,dark,x,h*.015,z,e*1.13,e*1.14,.036);
    ball(model.head,'#c8a451',x,h*.015,z+.023,e,e,.024);
    ball(model.head,'#1e2029',x,h*.025,z+.041,e*.76,e*.87,.016);
    ball(model.head,'#fff8e9',x-e*.28,h*.015+e*.36,z+.058,e*.25,e*.25,.009);
    ball(model.head,'#dacdaf',x+e*.29,-e*.25,z+.057,e*.11,e*.11,.008);
  }
  ball(model.head,white,0,h*.07,h*.65,h*.20,h*.70,h*.18);
  ball(model.head,white,0,-h*.42,h*.55,h*.36,h*.20,h*.27);
  ball(model.head,dark,0,-h*.20,h*.91,.046,.031,.025);
  ball(model.head,gray,-h*.105,-h*.31,h*.895,.063,.043,.014);
  ball(model.head,dark,h*.12,-h*.33,h*.887,.051,.047,.014);
  ball(model.head,gray,h*.32,-h*.40,h*.81,.065,.058,.014);
  ball(model.head,'#68575a',0,-h*.405,h*.83,.025,.012,.014);
  model.tail.position.set(0,y+.08,-v.length*.91);
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(.04,.12,-.20),new THREE.Vector3(.09,.40,-.29),new THREE.Vector3(.20,.58,-.22),new THREE.Vector3(.28,.54,-.16)]);
  model.tail.add(new THREE.Mesh(new THREE.TubeGeometry(curve,10,.083,6,false),materials.get(gray)));
  mergeClayMeshes(model.head as THREE.Group); mergeClayMeshes(model.tail as THREE.Group); mergeClayMeshes(model.body as THREE.Group,[...joints,model.head,model.tail]);
  return model;
}

export function icon(index:number) {
  const round=index===2?27:25, eye=index===0?5.4:6.2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g transform="rotate(${index===1?-9:index===2?7:0} 32 34)"><path d="M11 29L12 8Q21 8 27 21H38Q45 8 53 9L53 30" fill="#62646a"/><path d="M16 22L16 14L24 24M42 24L49 14L49 24" fill="#c19398"/><ellipse cx="32" cy="35" rx="${round}" ry="23" fill="#f1ede4"/><path d="M7 32Q9 14 29 13L27 26L21 37L8 39ZM35 13Q54 14 57 32L55 39L42 36L37 26Z" fill="#62646a"/><path d="M32 17Q27 29 26 37H39Q36 28 32 17" fill="#f1ede4"/><ellipse cx="20" cy="43" rx="12" ry="10" fill="#f1ede4"/><ellipse cx="44" cy="43" rx="12" ry="10" fill="#f1ede4"/>${[21,43].map(x=>`<circle cx="${x}" cy="33" r="${eye+.6}" fill="#292a30"/><circle cx="${x}" cy="33" r="${eye}" fill="#c8a451"/><ellipse cx="${x}" cy="32.7" rx="${eye*.74}" ry="${eye*.86}" fill="#1e2029"/><circle cx="${x-1.5}" cy="30.7" r="1.55" fill="#fff8e9"/><circle cx="${x+1.7}" cy="34.5" r=".65" fill="#d5cbb5"/>`).join('')}<path d="M28 41Q32 39 36 41Q35 44 32 44Q29 44 28 41" fill="#292a30"/><path d="M24 45Q28 42 30 46L29 49Q23 50 24 45ZM34 46Q39 43 40 48L37 50L34 49ZM43 45Q49 43 49 48L45 51L42 49Z" fill="#62646a"/><path d="M32 44V48M28 50Q32 53 36 50" fill="none" stroke="#68575a" stroke-width="1.3" stroke-linecap="round"/></g></svg>`;
}


