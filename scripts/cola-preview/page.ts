import { mountEggChoices } from './eggs';
import * as THREE from 'three';
import { variants } from './variants';
import { candidate } from './model';
import { icon, iconOptions } from './icons';
import { mountZoom } from './zoom';
import { makeColaModel } from '../../src/game/companions/ColaModel';
import { makePomeranianModel } from '../../src/game/companions/PomeranianModel';
import { DOG_COMBAT_SVG } from '../../src/ui/icons/DogCombatIcons';

document.body.innerHTML=`<main><header><small>COLA / DESIGN STUDY</small><h1>再选一个可乐探头彩蛋。</h1><p>模型已选定：低面版「元气可乐」。图标已选 C「弯眼甜笑」。向下查看三款开始界面彩蛋。</p><a href="#egg-selection">直接查看三款彩蛋 ↓</a></header><section class="layout"><div><div id="stage"></div><div class="controls"><button id="rotate" aria-pressed="false">自动旋转：关</button><button id="front">正面</button><button id="side">侧面</button><button id="back">背面</button><label>动作 <select id="action"><option value="idle">待机</option><option value="walk">走路</option><option value="dig">扒拉</option><option value="groom">舔毛</option><option value="sleep">睡觉</option></select></label></div><p class="hint">拖动查看角度 · 元气可乐模型已选定，下方可切换旧版与薯条作参考</p><div class="controls" id="models"></div></div><aside><h2>选择图标</h2><div id="icons"></div><div class="reference"><span>配对效果 · 随图标选择更新</span><div id="paired-icons">${DOG_COMBAT_SVG['dog-companion']}${icon(0)}</div><p>薯条左倾、右侧爱心 / 可乐右倾、左侧爱心</p></div></aside></section><footer><strong id="choice"></strong><p>选好后把下面这句话发给我；应用完成后删除临时页面。</p><textarea id="result" readonly aria-label="选择结果"></textarea><button id="copy">复制选择</button><span id="message" role="status"></span></footer></main>`;
let modelIndex=1,iconIndex=2, auto=false, angle=.25, action='idle';
const stage=document.querySelector<HTMLDivElement>('#stage')!;
const scene=new THREE.Scene(); scene.background=new THREE.Color('#e6e8dd');
const camera=new THREE.OrthographicCamera(-.8,.8,.75,-.55,.01,20);
camera.position.set(1.5,1.1,2.7); camera.lookAt(0,.40,0);
mountZoom(stage, camera);
const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputColorSpace=THREE.SRGBColorSpace; stage.append(renderer.domElement);
scene.add(new THREE.HemisphereLight('#fff7e8','#7e8879',2.7));
const light=new THREE.DirectionalLight('#fff6e2',3); light.position.set(-2,4,3); scene.add(light);
const ground=new THREE.Mesh(new THREE.CylinderGeometry(.59,.62,.055,48),new THREE.MeshStandardMaterial({color:'#bec9ac',roughness:1})); ground.position.y=-.045;scene.add(ground);
const shadow=new THREE.Mesh(new THREE.CircleGeometry(.34,32),new THREE.MeshBasicMaterial({color:'#64765b',transparent:true,opacity:.16,depthWrite:false}));shadow.rotation.x=-Math.PI/2; shadow.scale.y=1.5; shadow.position.y=-.015; scene.add(shadow);
const models=[...variants.map((_,i)=>candidate(i)),makeColaModel(),makePomeranianModel()];
models.forEach((m,i)=>{scene.add(m.group);m.group.visible=i===modelIndex;});
const names=[...variants.map(v=>v.name),'现有可乐','薯条参考'];
document.querySelector('#models')!.innerHTML=names.map((name,i)=>i===0||i===2?'':`<button data-model="${i}" aria-pressed="${i===modelIndex}">${name}</button>`).join('');
document.querySelector('#icons')!.innerHTML=iconOptions.map((v,i)=>i!==2?'':`<button class="icon-choice" data-icon="${i}" aria-pressed="${i===iconIndex}"><span class="big">${icon(i)}</span><span><b>${v.name}</b><small>${v.note}</small><span class="sizes"><span>${icon(i)}</span><span>${icon(i)}</span><span>${icon(i)}</span></span></span></button>`).join('');
function result(){
 const text=`可乐建模选 B（已选定的低面版元气可乐），图标选 ${'ABC'[iconIndex]}。保留正常猫咪腿长；应用后删除临时选型页面。`;
 document.querySelector('#choice')!.textContent=`已选模型：元气可乐 + 图标 ${'ABC'[iconIndex]}`;
 document.querySelector<HTMLTextAreaElement>('#result')!.value=text;
 document.querySelector('#paired-icons')!.innerHTML=DOG_COMBAT_SVG['dog-companion']+icon(iconIndex);
 document.querySelectorAll<HTMLElement>('[data-model]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.model)===modelIndex)));
 document.querySelectorAll<HTMLElement>('[data-icon]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.icon)===iconIndex)));
 try{localStorage.setItem('cola-paired-icon-choice',JSON.stringify({modelIndex,iconIndex}));}catch{}
}

models.forEach((m,i)=>m.group.visible=i===modelIndex);result();
document.querySelectorAll<HTMLElement>('[data-model]').forEach(b=>b.onclick=()=>{modelIndex=Number(b.dataset.model);models.forEach((m,i)=>m.group.visible=i===modelIndex);document.querySelectorAll<HTMLElement>('[data-model]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.model)===modelIndex)));});
document.querySelectorAll<HTMLButtonElement>('[data-icon]').forEach(button=>{button.disabled=true;button.setAttribute('aria-label','已选定图标 C：弯眼甜笑');});
function rotation(value:boolean){auto=value;document.querySelector('#rotate')!.textContent=`自动旋转：${auto?'开':'关'}`;document.querySelector('#rotate')!.setAttribute('aria-pressed',String(auto));}
document.querySelector<HTMLButtonElement>('#rotate')!.onclick=()=>rotation(!auto);
for(const [id,value] of [['front',.507],['side',.507+Math.PI/2],['back',.507+Math.PI]] as const) document.querySelector<HTMLButtonElement>(`#${id}`)!.onclick=()=>{rotation(false);angle=value;};
document.querySelector<HTMLSelectElement>('#action')!.onchange=e=>action=(e.target as HTMLSelectElement).value;
let drag:number|null=null;
renderer.domElement.onpointerdown=e=>{drag=e.clientX;renderer.domElement.setPointerCapture(e.pointerId);rotation(false);};
renderer.domElement.onpointermove=e=>{if(drag!==null){angle+=(e.clientX-drag)*.012;drag=e.clientX;}};
renderer.domElement.onpointerup=renderer.domElement.onpointercancel=()=>{drag=null;};
document.querySelector<HTMLButtonElement>('#copy')!.onclick=async()=>{const field=document.querySelector<HTMLTextAreaElement>('#result')!;field.select();try{await navigator.clipboard.writeText(field.value);document.querySelector('#message')!.textContent=' 已复制';}catch{document.querySelector('#message')!.textContent=' 请复制已选中的文字';}};
new ResizeObserver(()=>{const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.left=-.59*w/h;camera.right=.59*w/h;camera.top=.59;camera.bottom=-.59;camera.updateProjectionMatrix();}).observe(stage);
let previous=0;
renderer.setAnimationLoop((ms)=>{const dt=Math.min((ms-previous)/1000,.05);previous=ms;if(document.hidden)return;if(auto)angle+=dt*.3;const model=models[modelIndex];model.group.rotation.y=angle;model.update?.(ms/1000,action);if(!model.update){model.legs.forEach((leg,i)=>leg.rotation.x=action==='walk'?Math.sin(ms*.009+i*Math.PI)*.4:0);}renderer.render(scene,camera);});

mountEggChoices();
