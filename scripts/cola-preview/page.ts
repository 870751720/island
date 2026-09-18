import * as THREE from 'three';
import { candidate, icon, variants } from './variants';
import { makeColaModel } from '../../src/game/companions/ColaModel';
import { makePomeranianModel } from '../../src/game/companions/PomeranianModel';
import { COLA_ICON } from '../../src/ui/icons/ColaIcon';
import { DOG_COMBAT_SVG } from '../../src/ui/icons/DogCombatIcons';

document.body.innerHTML=`<main><header><small>COLA / DESIGN STUDY</small><h1>可乐，圆润一点，可爱一点。</h1><p>保留正常猫咪腿长、灰白花色、金色眼睛与嘴边花纹。参考薯条的画风，不照搬体型。</p></header><section class="layout"><div><div id="stage"></div><div class="controls"><button id="rotate" aria-pressed="true">自动旋转：开</button><button id="front">正面</button><button id="side">侧面</button><button id="back">背面</button><label>动作 <select id="action"><option value="idle">待机</option><option value="walk">走路</option><option value="dig">扒拉</option><option value="groom">舔毛</option><option value="sleep">睡觉</option></select></label></div><p class="hint">拖动查看角度 · 模型与图标可以自由搭配</p><div class="controls" id="models"></div></div><aside><h2>选择图标</h2><div id="icons"></div><div class="reference"><span>现有风格参考</span><div>${DOG_COMBAT_SVG['dog-companion']}${COLA_ICON}</div><p>薯条 / 现有可乐</p></div></aside></section><footer><strong id="choice"></strong><p>选好后把下面这句话发给我；应用完成后删除临时页面。</p><textarea id="result" readonly aria-label="选择结果"></textarea><button id="copy">复制选择</button><span id="message" role="status"></span></footer></main>`;
let modelIndex=1,iconIndex=1, auto=true, angle=.55, action='idle';
const stage=document.querySelector<HTMLDivElement>('#stage')!;
const scene=new THREE.Scene(); scene.background=new THREE.Color('#e6e8dd');
const camera=new THREE.OrthographicCamera(-.8,.8,.75,-.55,.01,20);
camera.position.set(1.5,1.1,2.7); camera.lookAt(0,.31,0);
const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputColorSpace=THREE.SRGBColorSpace; stage.append(renderer.domElement);
scene.add(new THREE.HemisphereLight('#fff7e8','#7e8879',2.7));
const light=new THREE.DirectionalLight('#fff6e2',3); light.position.set(-2,4,3); scene.add(light);
const ground=new THREE.Mesh(new THREE.CylinderGeometry(.59,.62,.055,48),new THREE.MeshStandardMaterial({color:'#bec9ac',roughness:1})); ground.position.y=-.045;scene.add(ground);
const shadow=new THREE.Mesh(new THREE.CircleGeometry(.34,32),new THREE.MeshBasicMaterial({color:'#64765b',transparent:true,opacity:.16,depthWrite:false}));shadow.rotation.x=-Math.PI/2; shadow.scale.y=1.5; shadow.position.y=-.015; scene.add(shadow);
const models=[...variants.map((_,i)=>candidate(i)),makeColaModel(),makePomeranianModel()];
models.forEach((m,i)=>{scene.add(m.group);m.group.visible=i===modelIndex;});
const names=[...variants.map(v=>v.name),'现有可乐','薯条参考'];
document.querySelector('#models')!.innerHTML=names.map((name,i)=>`<button data-model="${i}" aria-pressed="${i===modelIndex}">${name}</button>`).join('');
document.querySelector('#icons')!.innerHTML=variants.map((v,i)=>`<button class="icon-choice" data-icon="${i}" aria-pressed="${i===iconIndex}"><span class="big">${icon(i)}</span><span><b>${v.name}</b><small>${v.note}</small><span class="sizes"><span>${icon(i)}</span><span>${icon(i)}</span><span>${icon(i)}</span></span></span></button>`).join('');
function result(){
 const text=`可乐建模选 ${modelIndex<3?'ABC'[modelIndex]:names[modelIndex]}，图标选 ${'ABC'[iconIndex]}。保留正常猫咪腿长；应用后删除临时选型页面。`;
 document.querySelector('#choice')!.textContent=`当前搭配：${names[modelIndex]} + 图标 ${'ABC'[iconIndex]}`;
 document.querySelector<HTMLTextAreaElement>('#result')!.value=text;
 document.querySelectorAll<HTMLElement>('[data-model]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.model)===modelIndex)));
 document.querySelectorAll<HTMLElement>('[data-icon]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.icon)===iconIndex)));
 try{localStorage.setItem('cola-design-choice',JSON.stringify({modelIndex,iconIndex}));}catch{}
}
try{const saved=JSON.parse(localStorage.getItem('cola-design-choice')??'null');if(saved && Number.isInteger(saved.modelIndex)&&saved.modelIndex>=0&&saved.modelIndex<5&&Number.isInteger(saved.iconIndex)&&saved.iconIndex>=0&&saved.iconIndex<3){modelIndex=saved.modelIndex;iconIndex=saved.iconIndex;}}catch{}
models.forEach((m,i)=>m.group.visible=i===modelIndex);result();
document.querySelectorAll<HTMLElement>('[data-model]').forEach(b=>b.onclick=()=>{modelIndex=Number(b.dataset.model);models.forEach((m,i)=>m.group.visible=i===modelIndex);result();});
document.querySelectorAll<HTMLElement>('[data-icon]').forEach(b=>b.onclick=()=>{iconIndex=Number(b.dataset.icon);result();});
function rotation(value:boolean){auto=value;document.querySelector('#rotate')!.textContent=`自动旋转：${auto?'开':'关'}`;document.querySelector('#rotate')!.setAttribute('aria-pressed',String(auto));}
document.querySelector<HTMLButtonElement>('#rotate')!.onclick=()=>rotation(!auto);
for(const [id,value] of [['front',.507],['side',.507+Math.PI/2],['back',.507+Math.PI]] as const) document.querySelector<HTMLButtonElement>(`#${id}`)!.onclick=()=>{rotation(false);angle=value;};
document.querySelector<HTMLSelectElement>('#action')!.onchange=e=>action=(e.target as HTMLSelectElement).value;
let drag:number|null=null;
renderer.domElement.onpointerdown=e=>{drag=e.clientX;renderer.domElement.setPointerCapture(e.pointerId);rotation(false);};
renderer.domElement.onpointermove=e=>{if(drag!==null){angle+=(e.clientX-drag)*.012;drag=e.clientX;}};
renderer.domElement.onpointerup=renderer.domElement.onpointercancel=()=>{drag=null;};
document.querySelector<HTMLButtonElement>('#copy')!.onclick=async()=>{const field=document.querySelector<HTMLTextAreaElement>('#result')!;field.select();try{await navigator.clipboard.writeText(field.value);document.querySelector('#message')!.textContent=' 已复制';}catch{document.querySelector('#message')!.textContent=' 请复制已选中的文字';}};
new ResizeObserver(()=>{const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.left=-.72*w/h;camera.right=.72*w/h;camera.top=1.03;camera.bottom=-.41;camera.updateProjectionMatrix();}).observe(stage);
let previous=0;
renderer.setAnimationLoop((ms)=>{const dt=Math.min((ms-previous)/1000,.05);previous=ms;if(document.hidden)return;if(auto)angle+=dt*.3;const model=models[modelIndex];model.group.rotation.y=angle;model.update?.(ms/1000,action);if(!model.update){model.legs.forEach((leg,i)=>leg.rotation.x=action==='walk'?Math.sin(ms*.009+i*Math.PI)*.4:0);}renderer.render(scene,camera);});
