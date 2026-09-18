import * as THREE from 'three';
import type { CompanionModel } from './CompanionModel';
import { mergeClayMeshes } from '../core/mergeClayMeshes';


/** Independent clay character rig: surface coat markings, tall legs and an expressive face. */
export function makeColaModel(): CompanionModel {
  const style = { head: [.47,.46,.35], body: [.29,.29,.61], eye: .126, ears: .32, gray: '#646b80', white: '#fff5e9' };
  const root = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group(), tail = new THREE.Group();
  root.add(body); body.add(head, tail);
  root.scale.setScalar(.48);
  const white = style.white, gray = style.gray, ink = '#292632', pink = '#e4a3ad';
  const material = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true });
  function ellipsoid(parent: THREE.Object3D, color: string, position: number[], size: number[], segments = 7) {
    const mesh = new THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>(new THREE.SphereGeometry(1, segments, 5), material(color));
    mesh.position.set(position[0], position[1], position[2]);
    mesh.scale.set(size[0], size[1], size[2]);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function stroke(parent: THREE.Object3D, color: string, points: number[][], radius: number) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 6, radius, 4, false), material(color));
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
  }
  // Color the existing surface instead of stacking gray spheres on a white face.
  function coat(mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>, pattern: (x: number,y: number,z: number) => boolean) {
    const geometry = mesh.geometry.toNonIndexed(); mesh.geometry.dispose();
    const position = geometry.getAttribute('position');
    const colors = new Float32Array(position.count * 3);
    const a = new THREE.Color(white), b = new THREE.Color(gray);
    for (let i=0;i<position.count;i+=3) {
      const x=(position.getX(i)+position.getX(i+1)+position.getX(i+2))/3;
      const y=(position.getY(i)+position.getY(i+1)+position.getY(i+2))/3;
      const z=(position.getZ(i)+position.getZ(i+1)+position.getZ(i+2))/3;
      const color=pattern(x,y,z)?b:a;
      for(let j=0;j<3;j++) color.toArray(colors,(i+j)*3);
    }
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    mesh.geometry=geometry;
    mesh.material.color.set('#ffffff'); mesh.material.vertexColors=true;
  }
  const torso=ellipsoid(body,white,[0,.73,-.12],style.body);
  coat(torso,(x,y,z)=>y>.15 && (z<.25 || Math.abs(x)>.7) && !(x<-.1 && z>-.35 && z<-.08));
  ellipsoid(body,white,[0,.79,.32],[.30,.32,.27]);
  const legs: THREE.Group[]=[];
  for(const z of [.29,-.49]) for(const x of [-.22,.22]) {
    const joint=new THREE.Group();joint.position.set(x,.58,z);body.add(joint);legs.push(joint);
    ellipsoid(joint,white,[0,-.23,0],[.094,.29,.105]);
    ellipsoid(joint,white,[0,-.505,.055],[.125,.075,.155]);
  }
  const [hx,hy,hz]=style.head;
  head.position.set(0,1.08,.44);
  const face=ellipsoid(head,white,[0,0,0],style.head,8);
  coat(face,(x,y,z)=>z<.05 || (y>-.16 && Math.abs(x)>.17+Math.max(0,.45-y)*.38));
  // The face is one continuous silhouette, with shallow cheek pads and small triangular ears.
  for(const side of [-1,1]) {
    const ear=new THREE.Mesh(new THREE.ConeGeometry(.14,style.ears+.13,4),material(gray));
    ear.position.set(side*hx*.65,hy*.67+style.ears*.35,0);ear.rotation.z=-side*.20;
    ear.castShadow=true;ear.receiveShadow=true;head.add(ear);
    const inner=new THREE.Mesh(new THREE.ConeGeometry(.078,style.ears*.68,3),material(pink));
    inner.position.copy(ear.position);inner.position.z=.075;inner.rotation.z=ear.rotation.z;
    inner.scale.z=.25;inner.castShadow=true;inner.receiveShadow=true;head.add(inner);
    ellipsoid(head,white,[side*hx*.44,-hy*.39,hz*.68],[hx*.45,hy*.34,.095]);

  }
  const eyes: THREE.Group[]=[];
  ellipsoid(head,white,[0,-hy*.40,hz*.83],[.16,.12,.095]);
  for(const side of [-1,1]) {
    const eye=new THREE.Group();eye.position.set(side*hx*.43,-.015,hz*.90);head.add(eye);eyes.push(eye);
    const e=style.eye;
    ellipsoid(eye,'#d5b367',[0,0,.024],[e,e*1.035,.021],6);
    ellipsoid(eye,ink,[0,.012,.043],[e*.83,e*.91,.016]);
    ellipsoid(eye,'#fffdf4',[-e*.29,e*.37,.059],[e*.26,e*.28,.009]);
  }
  ellipsoid(head,ink,[0,-hy*.33,hz+.033],[.043,.028,.022]);
  ellipsoid(head,gray,[-.064,-hy*.45,hz+.008],[.049,.035,.013]);
  ellipsoid(head,gray,[.077,-hy*.46,hz+.005],[.032,.041,.013]);
  const mouthY=-hy*.51, mouthZ=hz+.025;
  stroke(head,ink,[[0,-hy*.37,mouthZ],[0,mouthY,mouthZ]],.008);
  ellipsoid(head,ink,[0,mouthY-.025,mouthZ],[.05,.041,.012]);
  ellipsoid(head,pink,[0,mouthY-.046,mouthZ+.012],[.032,.020,.007]);
  tail.position.set(0,.80,-.66);
  stroke(tail,gray,[[0,0,0],[.04,.11,-.21],[.12,.44,-.30],[.24,.70,-.24],[.34,.73,-.12],[.36,.65,-.055]],.067);
  ellipsoid(tail,gray,[.36,.65,-.055],[.069,.072,.069]);
  // Preserve the surface-colored pieces and the independently animated eyes.
  for(const leg of legs) mergeClayMeshes(leg);
  for(const eye of eyes) mergeClayMeshes(eye);
  mergeClayMeshes(head,[face,...eyes]);
  mergeClayMeshes(tail);
  mergeClayMeshes(body,[torso,head,tail,...legs]);
  return {group:root,body,head,tail,legs:[],update(t,action){
    const walk=action==='walk'||action==='flee', sleep=action==='sleep', dig=action==='dig', groom=action==='groom', swim=action==='swim';
    body.position.y=sleep?-.24:walk?Math.sin(t*12)*.018:Math.sin(t*2.2)*.009;
    body.scale.y=sleep?.72:1;
    body.rotation.x=dig?.08:action==='stretch'?.13:0;
    body.rotation.z=action==='shake'?Math.sin(t*32)*.13:0;
    head.rotation.set(sleep?.22:swim?-.2:dig?.35:action==='sniff'?.3:groom?.22:Math.sin(t*1.6)*.045,Math.sin(t*.85)*.075,groom?-.24:Math.sin(t*1.1)*.055);
    tail.rotation.set(sleep?-.8:Math.sin(t*1.8)*.06,sleep?1.1:Math.sin(t*1.9)*.20,Math.sin(t*2.4)*.09);
    const blink=t%4.7;
    for(const eye of eyes) eye.scale.y=sleep?.10:blink>4.48?Math.max(.10,Math.abs(blink-4.59)/.11):1;
    legs.forEach((leg,i)=>leg.rotation.x=swim?Math.sin(t*15+i*Math.PI*.5)*.75:sleep?-1.1:dig&&i<2?Math.sin(t*16+i*Math.PI)*.65:groom&&i===1?-1.35:walk?Math.sin(t*10+(i===0||i===3?0:Math.PI))*.40:0);
  }};
}
