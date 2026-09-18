import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { IslandScene } from '../../src/ui/start/IslandScene';
import { icon } from './icons';

const choices = [
  { name: 'A · 笑眯眯探头', note: '沿用已选 C 的弯眼笑脸，正头、无爱心地探出来', face: 2, paws: false },
  { name: 'B · 扒门打招呼', note: '正头、无爱心的甜笑，加两只白爪搭在门口', face: 2, paws: true },
  { name: 'C · 好奇偷看', note: '睁开金色圆眼，正头、无爱心地看着你', face: 0, paws: false },
];

export function mountEggChoices(): void {
  const section = document.createElement('section');
  section.id = 'egg-selection';
  section.className = 'egg-selection';
  section.innerHTML = `<h2>开始界面 · 可乐彩蛋重新选</h2><p>模型已选元气可乐，头像已选 C。下面单独选择帐篷里探头的可乐。</p><div class="egg-grid"></div><p id="egg-result" role="status">尚未选择彩蛋</p>`;
  document.querySelector('footer')!.before(section);
  const template = renderToStaticMarkup(createElement(IslandScene, { paused: true, interactive: true }));
  choices.forEach((choice,index) => {
    const card=document.createElement('article');
    card.innerHTML=`<h3>${choice.name}</h3><p>${choice.note}</p><div class="egg-scene">${template}</div><p>帐篷局部放大</p><div class="egg-closeup"></div><div class="controls"><button data-replay>播放探头</button><button data-choose aria-pressed="false">选择彩蛋 ${'ABC'[index]}</button></div>`;
    const scene=card.querySelector<SVGSVGElement>('.menu-island')!;
    // Each full scene owns its clip IDs; avoid cross-card SVG fragment references.
    scene.querySelectorAll('[id]').forEach(element=>{
      const old=element.id, next=`egg-${index}-${old}`;
      element.id=next;
      scene.querySelectorAll('[clip-path]').forEach(clipped=>{
        if(clipped.getAttribute('clip-path')===`url(#${old})`)clipped.setAttribute('clip-path',`url(#${next})`);
      });
    });
    scene.querySelectorAll('[tabindex]').forEach(node=>{node.removeAttribute('tabindex');node.removeAttribute('role');});
    const cat=scene.querySelector<SVGGElement>('[data-companion="cat"]')!;
    cat.removeAttribute('display');
    const face=icon(choice.face, false).replace('<svg ',`<svg x="199" y="${choice.paws?142:144}" width="16" height="16" style="width:16px;height:16px" `);
    cat.innerHTML=face+(choice.paws?'<g fill="#fff4e5"><ellipse cx="202" cy="159" rx="2.4" ry="1.6"/><ellipse cx="213" cy="159" rx="2.4" ry="1.6"/></g>':'');
    const companion=scene.querySelector<SVGGElement>('.egg-companion')!;
    companion.setAttribute('opacity','1');companion.setAttribute('visibility','visible');
    // A magnified crop uses the same scene markup, preserving size and tent placement.
    const close=scene.cloneNode(true) as SVGSVGElement;
    close.setAttribute('viewBox','186 130 44 34');close.removeAttribute('class');
    close.querySelectorAll('[id]').forEach(element=>{
      const old=element.id,next=`close-${old}`;element.id=next;
      close.querySelectorAll('[clip-path]').forEach(node=>{if(node.getAttribute('clip-path')===`url(#${old})`)node.setAttribute('clip-path',`url(#${next})`);});
    });
    card.querySelector('.egg-closeup')!.append(close);
    let animation: Animation | undefined;
    card.querySelector<HTMLButtonElement>('[data-replay]')!.onclick=()=>{
      animation?.cancel();
      if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
      animation=companion.animate([{opacity:0,transform:'translateY(15px)'},{opacity:1,transform:'translateY(0)',offset:.22},{opacity:1,transform:'translateY(0)',offset:.78},{opacity:0,transform:'translateY(15px)'}],{duration:2200,easing:'ease-in-out'});
    };
    card.querySelector<HTMLButtonElement>('[data-choose]')!.onclick=()=>{
      section.querySelectorAll('[data-choose]').forEach(button=>button.setAttribute('aria-pressed','false'));
      card.querySelector('[data-choose]')!.setAttribute('aria-pressed','true');
      section.querySelector('#egg-result')!.textContent=`彩蛋已选：${choice.name}`;
      const result=document.querySelector<HTMLTextAreaElement>('#result')!;
      result.value=`模型选低面版元气可乐，图标选 C（右倾、左侧爱心、弯眼甜笑），开始界面可乐彩蛋选 ${'ABC'[index]}（${choice.name.slice(4)}）。应用后删除临时选型页。`;
    };
    section.querySelector('.egg-grid')!.append(card);
  });
}
