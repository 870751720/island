import { readFileSync, writeFileSync } from 'node:fs';

// 本地选型素材生成器；SVG 均由路径绘制，不读取 emoji 或外部图片。
const foodSource = readFileSync('src/game/systems/Food.ts', 'utf8');
const chosenSource = readFileSync('src/ui/icons/FoodIcons.ts', 'utf8');
const excluded = new Set(['shrimp', 'cuttlefish', ...Array.from(chosenSource.matchAll(/^\s*(\w+):/gm), m => m[1])]);
const items = Array.from(foodSource.matchAll(/kind: '([^']+)', name: '([^']+)'/g), m => ({ kind: m[1], name: m[2] })).filter(i => !excluded.has(i.kind));
const p = (d: string, fill: string, stroke = 'none', width = 2) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const e = (x: number, y: number, rx: number, ry: number, fill: string) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
const r = (x: number, y: number, w: number, h: number, radius: number, fill: string) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}"/>`;
const g = (transform: string, body: string) => `<g transform="${transform}">${body}</g>`;
const line = (d: string, color = '#806347', width = 2) => p(d, 'none', color, width);
const leaf = (x: number, y: number, rotation = 0) => g(`translate(${x} ${y}) rotate(${rotation})`, p('M0 0Q-11-13-17-5Q-12 5 0 0Z', '#7c9c61') + line('M-12-4L0 0', '#587b4e', 1.2));
const glint = (x: number, y: number) => e(x, y, 3.5, 1.8, '#fff0d7');
const scorch = line('M23 29l5 4M30 25l5 4M36 31l5 4', '#885335', 2.5);

function produce(kind: string, v: number): string {
  switch (kind) {
    case 'berry': return (v === 1 ? [[23,32],[39,31],[31,44]] : [[20,36],[32,29],[44,37],[32,46]]).map(([x,y],i) => e(x,y,9,9,i%2 ? '#b45066':'#d56a76') + glint(x-3,y-4)).join('') + leaf(32,22) + line('M32 22Q32 15 37 12','#695b3c',2.5);
    case 'fruitFruit': return v === 1 ? p('M32 22C15 10 8 29 16 44Q23 55 32 49Q43 55 50 39C59 17 39 15 32 22Z','#d56b61','#a24c4c')+p('M36 25Q48 18 49 31Q49 44 37 48Q45 36 36 25Z','#bc514e')+line('M32 22Q30 15 35 10')+leaf(34,17,140)+glint(23,28) : p('M13 24Q29 11 44 24L50 43Q33 59 14 45Z','#d46a5b')+p('M16 25Q31 19 44 25L46 41Q31 52 18 42Z','#f5deaf')+p('M31 25Q24 36 31 43Q39 35 31 25Z','#fff1d2')+e(29,34,1.4,2.3,'#765137')+e(34,36,1.4,2.3,'#765137')+leaf(47,20,15);
    case 'oakFruit': return (v===1 ? [[0,0,0]]:[[ -7,3,-20],[12,-4,24]]).map(([x,y,a])=>g(`translate(${x} ${y}) rotate(${a} 32 32)`,p('M21 29Q17 45 32 52Q47 45 43 29Z','#bd8951','#88643f')+p('M18 29Q18 18 32 19Q46 18 46 29Q33 34 18 29Z','#826344')+line('M24 24l3 4m5-6l3 6m5-4l2 3','#b79a67',1.5)+line('M32 20L34 13')+glint(27,36))).join('');
    case 'pineFruit': return g(v===2?'rotate(32 32 32)':'rotate(-12 32 32)',p('M32 10Q50 21 46 43Q43 53 31 54Q16 50 17 35Q19 17 32 10Z','#967050','#695341')+Array.from({length:4},(_,j)=>Array.from({length:j===0?2:3},(_,i)=>p(`M${21+i*8-(j===0?-4:0)} ${19+j*8}q4 9 9 0q-4-5-9 0Z`,j%2?'#bd9668':'#c6a474')).join('')).join('')+line('M32 11L34 7'))+(v===2?leaf(48,45,-30):'');
    case 'carrot': return g(v===1?'rotate(28 32 32)':'rotate(-25 32 32)',leaf(32,19,0)+leaf(32,19,120)+line('M32 20L31 7','#6b914c',3)+p('M20 24Q32 17 44 24Q39 43 29 55Q23 45 20 24Z','#e89b54','#bb7941')+p('M24 26Q27 22 30 25L29 45Z','#f8c478')+line('M35 30l7-2M24 36l7 1M31 44l5-1','#c57c3f'));
    case 'potato': return (v===1?[[0,0,0]]:[[-9,4,-20],[11,-5,35]]).map(([x,y,a])=>g(`translate(${x} ${y}) rotate(${a} 32 34) scale(${v===1?1:.75})`,p('M17 21Q31 12 43 21Q53 25 50 40Q45 52 28 51Q12 49 12 36Q11 27 17 21Z','#c8a471','#987c54')+glint(23,25)+e(23,40,1.5,1,'#92754c')+e(39,29,1.5,1,'#92754c')+e(39,43,1.5,1,'#92754c'))).join('');
    case 'sweetPotato': return v===1?g('rotate(-28 32 32)',p('M9 34Q22 14 43 24L56 33Q45 47 25 44Z','#b87770','#8e5856')+line('M20 34Q30 28 42 31','#dda38c',3)+line('M15 36l5 3M42 36l4 1','#915d59',1.5)):p('M9 39Q12 21 37 21L52 30L41 48Q18 55 9 39Z','#a66a6c')+p('M30 23Q43 18 52 30Q53 40 41 48Q26 45 25 34Z','#efbf72','#8e5856')+p('M32 27Q43 23 47 32Q47 39 40 43Q31 40 30 34Z','#f8d597');
    case 'corn': return g(v===1?'rotate(20 32 32)':'rotate(-30 32 32)',p('M22 22Q23 9 32 9Q43 9 43 22L42 44Q32 54 22 43Z','#dfb64f','#ba923b')+Array.from({length:5},(_,j)=>Array.from({length:3},(_,i)=>r(24+i*6,16+j*6,4.5,5,2,'#f7d87c')).join('')).join('')+p(v===1?'M32 54Q10 46 13 27Q29 34 32 54ZM32 54Q35 34 52 26Q49 49 32 54Z':'M32 54Q10 42 15 24Q23 43 32 54ZM32 54Q43 38 51 32Q48 48 32 54Z','#86a165')+line('M19 36L31 52M44 38L34 51','#577b4d',1.4));
    case 'soybean': return v===1?g('rotate(-20 32 32)',p('M13 22Q30 11 47 24Q57 38 38 48Q21 53 15 40Z','#91a265','#627a48')+[[23,28],[32,34],[39,40]].map(([x,y])=>e(x,y,6,6,'#e7cd8e')+glint(x-1,y-2)).join('')):[[23,28],[40,30],[31,44]].map(([x,y])=>e(x,y,9,7,'#dec28b')+line(`M${x+2} ${y-3}q-4 2-1 5`,'#ad9361',1.5)+glint(x-3,y-3)).join('')+leaf(42,20,30);
    case 'tomato': return v===1?e(32,35,21,18,'#d97660')+e(35,38,17,14,'#cd604f')+p('M32 23L23 14L26 24L15 24L27 29L31 34L35 27L47 25L37 22L39 15Z','#709056')+glint(22,32):e(32,34,23,20,'#ce6452')+e(32,33,19,16,'#f09b77')+p('M32 19L35 30L48 30L37 35L43 45L32 38L22 46L26 35L15 29L28 29Z','#f5c39a')+[[24,26],[41,27],[23,39],[40,40]].map(([x,y])=>e(x,y,2,1,'#ffe1a7')).join('');
    case 'pepper': return g(v===1?'rotate(-15 32 32)':'rotate(30 32 32)',p('M29 19Q48 17 45 32Q42 49 13 53Q30 42 27 29Z','#cc6554','#a04a43')+line('M31 25Q40 26 33 39','#ef9b78',3)+line('M29 22Q24 12 35 10','#688451',4));
    case 'eggplant': return g(v===1?'rotate(24 32 32)':'rotate(-30 32 32)',p('M26 20Q21 25 18 35Q12 53 30 55Q48 55 46 40L38 20Z','#94769d','#6b577e')+p('M26 27Q17 46 25 49Q30 49 29 37L31 26Z','#bea0bb')+p('M23 24L25 17L32 19L38 16L43 24L35 23L32 29L29 23Z','#7b955c')+line('M32 20Q29 13 35 9','#637e4d',3));
    case 'strawberry': return (v===1?[[0,0,1]]:[[-9,7,.8],[15,-2,.75]]).map(([x,y,s])=>g(`translate(${x} ${y}) scale(${s})`,p('M13 29Q15 18 30 24Q45 16 51 29Q49 43 32 55Q17 47 13 29Z','#d7787c','#ae555f')+p('M31 25L20 16L25 25L14 25L27 31L32 35L37 28L48 24L36 23L36 16Z','#7b9a61')+[[22,34],[31,40],[41,34],[26,46],[38,45]].map(([a,b])=>e(a,b,1,1.8,'#ffe2ae')).join('')+glint(20,31))).join('');
    case 'cabbage': return v===1?e(32,34,23,21,'#86aa70')+e(31,31,17,17,'#c0d299')+p('M9 31Q26 28 34 53Q9 55 9 31ZM55 28Q35 31 31 55Q55 53 55 28Z','#93b97a')+line('M14 36Q23 39 29 50M48 35Q40 39 36 48M22 23Q31 16 40 27M21 30Q29 25 35 30','#d9e4ba',2):p('M12 46L34 12L55 45Q35 58 12 46Z','#6f9665')+p('M17 43L34 17L50 43Q34 52 17 43Z','#d7dfb0')+line('M34 21L34 47M31 29L24 39L31 43M38 29L45 40L38 44','#98b581',2);
    case 'pumpkin': return v===1?e(32,36,24,18,'#ca8748')+e(24,36,12,18,'#e4a558')+e(39,36,12,18,'#df9b4e')+e(32,36,8,18,'#f0b866')+line('M32 20Q29 11 36 10','#75804e',5)+glint(28,28):p('M10 24Q29 46 54 21L48 45Q28 61 13 44Z','#b67a42')+p('M10 24Q29 43 54 21L46 41Q30 53 16 40Z','#efb05c')+p('M18 28Q33 40 46 27L40 37Q31 44 24 36Z','#f8d394')+[[28,35],[35,36],[39,32]].map(([x,y])=>e(x,y,2.4,1.3,'#fff0ce')).join('');
    default: throw new Error(`Missing produce: ${kind}`);
  }
}

const fishColors: Record<string, [string,string,number]> = {
  sardine:['#91b5c2','#d5e3dc',8], perch:['#8d9d70','#ddd09a',13], loach:['#a4936f','#d7c8a0',6],
  anchovy:['#96b2ba','#e0e5da',6], horseMackerel:['#7eaaa4','#d7dbc0',10], yellowCroaker:['#cfb166','#f3d99a',11],
  saury:['#8aa5b6','#d5e0df',5], hairtail:['#aabec5','#eef0e6',4], grouper:['#9a9c7b','#d4c9a2',14],
  catfish:['#7c9089','#bdc5ab',12], grassCarp:['#92a379','#d8d6ad',11], goldenFish:['#d3ac50','#fae0a0',13],
  swordfish:['#88a7ba','#c8dce0',9], puffer:['#d9bc68','#f1e2ae',17], manta:['#85969f','#b6c7c5',16],
};
function fish(kind: string, v: number, roasted = false): string {
  let [color, belly, h] = fishColors[kind];
  if (roasted) { color=kind==='goldenFish'?'#e4b956':'#cc955e'; belly='#eed09b'; }
  const dark=roasted?'#92613e':'#596f70';
  let body = '';
  if(kind==='manta') {
    body=line(v===1?'M33 37Q47 57 52 54':'M33 37Q26 57 43 56',dark,3)+p(v===1?'M32 16Q21 26 7 33Q18 45 28 40L33 47L39 40Q51 43 58 31Q42 25 32 16Z':'M31 16Q16 16 8 26L20 43L31 38L45 43L57 24Q42 18 31 16Z',color,dark)+p('M30 22Q22 34 30 40Q38 38 37 29Z',belly)+e(27,24,1.5,1.5,dark)+e(37,24,1.5,1.5,dark);
  } else if(kind==='hairtail') {
    body=p(v===1?'M8 22Q31 13 52 25Q66 40 43 47Q24 54 18 43Q36 49 49 38Q57 30 19 31L9 29Z':'M10 19Q42 7 52 26Q58 45 31 46Q19 46 20 53Q9 42 28 39Q47 38 44 28Q40 21 11 28Z',color,dark)+line(v===1?'M18 24Q59 19 54 34Q52 40 34 45':'M19 20Q51 14 49 31Q46 41 28 42',belly,2)+e(13,24,1.8,1.8,dark);
  } else if(kind==='puffer') {
    body=p('M47 30L57 25L54 34L58 40L47 39Z',color)+Array.from({length:7},(_,i)=>g(`rotate(${i*30-90} 31 34)`,p('M29 18L32 10L35 18Z',color))).join('')+e(31,34,v===1?21:18,v===1?17:20,color)+p('M12 36Q31 49 50 36Q47 53 31 52Q15 51 12 36Z',belly)+[[26,24],[35,22],[41,28],[29,31]].map(([x,y])=>e(x,y,1.5,1.5,'#aa9555')).join('')+e(17,32,3,3,'#fff4dd')+e(17,32,1.5,1.5,dark);
  } else {
    if (v===2) h*=1.2;
    const tail=kind==='loach'?'M46 30Q58 26 56 36L46 38Z':v===1?'M46 30L58 22L55 34L58 45L46 38Z':'M46 30Q54 24 58 26L54 34L57 42Q51 42 46 38Z';
    body=p(tail,color,dark,1.5)+p(`M12 32Q23 ${31-h} 44 ${30-h/2}L49 33L45 38Q25 ${38+h} 12 36Z`,color,dark)+p(`M14 35Q30 ${36+h*.3} 47 34Q36 ${39+h} 17 39Z`,belly)+p(`M26 ${30-h*.7}L33 ${18-h*.3}L41 ${29-h*.3}Z`,color)+p('M29 37L35 46L39 38Z',color)+line(`M21 29Q25 35 21 39`,dark,1.3)+e(17,32,2.5,2.5,'#fff2d4')+e(17,32,1.2,1.2,dark)+line(`M27 ${30-h*.25}L39 ${31-h*.25}`,belly,2);
    if(['perch','horseMackerel'].includes(kind)) body+=line('M29 25L27 34M36 25L33 34M43 28L40 34',dark,1.8);
    if(kind==='grouper') body+=[[28,29],[36,30],[40,35],[30,37],[24,34]].map(([x,y])=>e(x,y,1.7,1.5,dark)).join('');
    if(kind==='grassCarp') body+=line('M28 29q3 5 5 0m1 4q3 4 5 0m0-5q3 4 5 0',dark,1);
    if(kind==='catfish'||kind==='loach') body+=line('M13 35Q7 39 6 44M16 38Q14 45 20 46',dark,1.4);
    if(kind==='swordfish') body+=p('M14 31L2 28L14 35Z',color,dark,1);
  }
  if(roasted) body+=scorch;
  if(kind==='goldenFish') body+=p('M49 10L51 15L56 17L51 19L49 24L47 19L42 17L47 15Z','#f6dda0');
  return g(v===1?'rotate(-16 32 32)':'rotate(19 32 32)',body);
}

function drink(kind: string, v: number): string {
  const milk=kind==='milk'; const wine=kind.startsWith('wine');
  const colors: Record<string,string>={cola:'#c9705e',colaZero:'#555c60',milk:'#f4e8ce',wineBerry:'#b27791',wineFruit:'#d5ad65',wineMilk:'#e8d8b7',wineGolden:'#dbb352'};
  const color=colors[kind];
  let body='';
  if(!milk&&!wine) {
    body=v===1?r(19,16,26,36,6,color)+e(32,17,13,4,'#c6cfcb')+e(32,17,5,2,'#8d9a98')+line('M22 37Q30 29 42 32','#f6e7d0',4)+r(23,22,3,23,1.5,'#ffffff40')+e(32,49,11,2,'#00000015'):p('M27 10H37L38 20Q46 25 44 34L43 51Q32 57 21 51L20 34Q18 26 26 20Z',color,'#697675')+r(26,8,12,6,2,'#babfba')+r(22,30,21,13,3,kind==='cola'?'#f1dec0':'#c3c6bd')+line('M25 38Q30 32 39 35',color,3)+line('M25 23L24 29','#ffffff60',2);
    if(kind==='colaZero') body+=e(32,v===1?41:36,3,4,'#e7e7db')+e(32,v===1?41:36,1.5,2.5,'#555c60');
  } else {
    body=v===1?p('M26 11H38V22Q46 25 46 33V49Q45 55 32 55Q19 55 18 49V33Q18 25 26 22Z',milk?'#c4d1c7':'#9aa994','#667e73')+p('M21 34Q32 37 43 34V48Q32 55 21 48Z',color)+r(25,9,14,7,2,wine?'#a5855c':'#97b2aa')+r(24,36,16,12,4,'#fff0d3')+line('M23 27L22 32','#eaf0d9',2):p('M23 18Q11 21 15 44Q17 55 33 54Q48 54 49 43Q52 24 40 18Z',color,'#8b8066')+p('M22 18L25 10H38L42 18Q34 24 22 18Z',milk?'#d8ddc8':'#a5b29a','#8b8066')+e(32,13,6,2,'#727c68')+p('M44 27Q61 24 55 40Q53 45 48 44','none','#8b8066',3)+glint(23,29)+r(23,31,18,14,5,'#fff0d3');
    const cy=v===1?42:38;
    if(kind==='wineBerry')body+=e(29,cy,3,3,'#aa6380')+e(35,cy+1,3,3,'#bc7890')+leaf(33,cy-4,0);
    else if(kind==='wineFruit')body+=e(32,cy,5,4,'#d9a05c')+line(`M32 ${cy-4}l2-3`,'#738355',1.5);
    else if(kind==='wineGolden')body+=p(`M32 ${cy-6}l2 4l4 2l-4 2l-2 4l-2-4l-4-2l4-2Z`,'#c29b42');
    else body+=p(`M32 ${cy-6}q-9 12 0 12q9 0 0-12Z`,'#b9cfc6');
  }
  return body;
}

function roast(kind: string, v: number): string {
  if(kind==='bread')return v===1?p('M10 33Q8 16 30 16Q53 14 54 34V46Q31 56 11 46Z','#c59458','#987045')+p('M12 32Q12 19 31 20Q48 18 51 32Z','#e4bc79')+line('M22 23l-3 8M33 22l-3 9M43 24l-3 7','#fff0c6',3):p('M16 29Q9 13 30 13Q53 12 49 29L49 50H16Z','#b88854','#916a46')+p('M21 29Q14 18 31 18Q47 18 44 29V45H21Z','#efd6a3')+[[25,26],[37,30],[28,38],[40,40]].map(([x,y])=>e(x,y,1.5,1.2,'#c9ad7b')).join('');
  if(kind.includes('Fish')) return (v===1?line('M6 45L57 20','#96734e',2.5):p('M8 48Q28 39 54 46L50 53H12Z','#a9bda0'))+fish(kind==='cookedGoldenFish'?'goldenFish':kind==='cookedBigFish'?'grouper':'sardine',v,true);
  if(kind==='cookedCrabMeat')return line(v===1?'M12 52L50 11':'M9 34H57','#987b58',2.5)+[0,1,2].map(i=>g(v===1?`translate(${i*11-10} ${-i*11+10}) rotate(35 32 32)`:`translate(${i*14-14} 0) scale(.95)`,p('M24 24Q31 20 40 25L39 39Q31 44 24 38Z','#e6b78a','#b87c57')+p('M26 25L29 37L36 38L36 25Z','#f6dfb5')+line('M28 30L36 32','#ab714d',2))).join('');
  const base=kind.replace(/^cooked/, ''); const raw=base[0].toLowerCase()+base.slice(1);
  const food=produce(raw,v);
  return (v===1?line('M10 53L54 13','#a07b53',2.5):p('M9 46Q28 35 55 43Q44 57 12 51Z','#9caf84')+line('M16 48L48 45','#d7ddba',1.2))+g('translate(5 4) scale(.86)',food)+scorch+line('M24 12Q20 8 24 5M34 12Q30 8 34 5','#b9b4a0',1.5);
}

function porridge(v: number, id: string): string {
  const bowl=v===1?'#a8bfb1':'#c8a282';
  return p('M9 30Q11 54 32 55Q52 53 55 30Z',bowl,'#788e80')+e(32,30,23,10,'#e3d9b7')+e(32,30,19,7,'#ecc88d')+`<defs><clipPath id="${id}">${p('M13 12H51V30A19 7 0 0 1 13 30Z','#fff')}</clipPath></defs><g clip-path="url(#${id})">`+[[23,28],[34,27],[41,32]].map(([x,y],i)=>g(`rotate(${i*20-10} ${x} ${y})`,r(x-4,y-4,9,9,2,'#e6a762')+p(`M${x-4} ${y+2}h9v3h-9Z`,'#b97860'))).join('')+[[18,31],[28,32],[34,34],[44,28]].map(([x,y])=>e(x,y,1.8,1,'#fff0c6')).join('')+'</g>'+p('M9 30A23 10 0 0 0 55 30','none',v===1?'#d7e3cd':'#ead3b1',2.6)+line('M19 43Q31 50 44 42','#ffffff40',2)+line('M26 16Q22 12 26 8M37 16Q33 12 37 8','#b8b9a7',1.5);
}

function art(kind: string, v: number, id: string): string {
  let body: string;
  if(kind in fishColors)body=fish(kind,v);
  else if(kind.startsWith('wine')||['cola','colaZero','milk'].includes(kind))body=drink(kind,v);
  else if(kind.startsWith('cooked')||kind==='bread')body=roast(kind,v);
  else if(kind==='boiledSweetPotato')body=porridge(v,id);
  else if(kind==='crabMeat')body=v===1?p('M13 39L22 22Q31 19 39 24L50 38L40 48L20 48Z','#e1a491','#ba7b6b')+p('M20 36L24 25L30 26L28 43L21 44ZM32 26L38 28L44 38L38 43L32 42Z','#fae4cf')+line('M24 28L22 39M36 30L39 38','#d7b9a0',1.4):[0,1,2].map(i=>g(`translate(${i*13-12} ${i%2*9-3}) rotate(${i*12-10} 32 32)`,p('M27 20Q33 18 38 24L37 43Q31 49 25 42Z','#f4dac0','#d79581')+p('M27 21Q31 19 34 22L30 43L26 42Z','#dd9382')+line('M33 25L33 40','#fff1d7',2))).join('');
  else body=produce(kind,v);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true">${e(32,57,21,3,'#58462a15')}${body}</svg>`;
}
const groups = ['果蔬与坚果', '鱼类与蟹肉', '烤食与主食', '饮品与酒'];
function category(kind: string): number { return kind in fishColors || kind==='crabMeat'?1:kind.startsWith('cooked')||kind==='bread'||kind.startsWith('boiled')?2:kind.startsWith('wine')||['cola','colaZero','milk'].includes(kind)?3:0; }
let rules='';
const sections=groups.map((name,index)=>`<section id="group-${index}"><h2>${name}<small>${items.filter(i=>category(i.kind)===index).length} 项</small></h2><div class="items">${items.filter(i=>category(i.kind)===index).map((item)=>{
  const choices=[1,2].map(v=>{
    rules+=`body:has(#${item.kind}-${v}:checked) .s-${item.kind}-${v}{display:inline}body:has(#${item.kind}-${v}:checked) .s-${item.kind}-none{display:none}`;
    return `<label class="choice" for="${item.kind}-${v}"><input type="radio" name="${item.kind}" id="${item.kind}-${v}" value="${v}"><span class="option">方案 ${v}</span><div class="large">${art(item.kind,v,`${item.kind}-${v}-large`)}</div><div class="sizes"><span class="slot light">${art(item.kind,v,`${item.kind}-${v}-32`)}</span><span class="slot dark">${art(item.kind,v,`${item.kind}-${v}-24`)}</span><small>32 / 24 px</small></div></label>`;
  }).join('');
  return `<article><header><h3>${item.name}</h3><small>${item.kind}</small></header><div class="choices">${choices}</div></article>`;
}).join('')}</div></section>`).join('');
const summary=items.map(i=>`<span class="summary-item"><b>${i.name}</b> <span class="s-${i.kind}-none">未选</span><span class="selected s-${i.kind}-1">1</span><span class="selected s-${i.kind}-2">2</span></span>`).join('');
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>剩余食物 · 两款选型</title><style>
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:78px}body{margin:0;background:#f5f2e9;color:#3f4c3f;font-family:"Segoe UI","Microsoft YaHei",sans-serif}main{max-width:1420px;margin:auto;padding:40px 32px 80px}.eyebrow{font-size:12px;letter-spacing:3px;color:#8d987d}h1{font-size:36px;margin:12px 0}p{color:#7c8273;line-height:1.8;margin:8px 0}nav{position:sticky;top:0;z-index:5;background:#f5f2e9f2;border-bottom:1px solid #dedfd1;backdrop-filter:blur(12px);padding:16px 24px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap}a{color:#526c50;text-decoration:none;background:#e6ebdd;border-radius:20px;padding:9px 18px;font-size:13px}h2{margin:40px 0 18px;font-size:23px}h2 small{font-size:13px;margin-left:14px;color:#90967f;font-weight:400}.items{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}article{padding:18px;background:#fffdf7;border:1px solid #e2e2d4;border-radius:20px}header{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:15px}h3{font-size:16px;margin:0}header small{font-size:10px;color:#a1a58f}.choices{display:grid;grid-template-columns:1fr 1fr;gap:10px}.choice{position:relative;display:block;border:2px solid #ecebdf;border-radius:14px;padding:12px 6px;cursor:pointer;background:#f9f8ef;transition:background .15s,border-color .15s}.choice:hover{border-color:#b7c3a4}.choice:has(input:checked){border-color:#7c9564;background:#edf1e1;box-shadow:0 0 0 2px #8ea17718}.choice:has(input:focus-visible){outline:3px solid #ad8754;outline-offset:3px}input{accent-color:#768d5d;position:absolute;right:10px;top:11px;width:16px;height:16px}.option{display:block;font-size:11px;color:#7e866f;padding-left:5px}.large{height:130px;display:grid;place-items:center}.large svg{width:122px;height:122px}.sizes{display:flex;justify-content:center;align-items:center;gap:6px}.slot{display:grid;place-items:center;width:39px;height:39px;border-radius:9px}.light{background:#eeeadc;border:1px solid #dedecb}.dark{background:#414d46}.light svg{width:32px;height:32px}.dark svg{width:24px;height:24px}.sizes small{font-size:9px;color:#9c9f8d}.summary{padding:24px;background:#e9eddf;border-radius:20px;display:flex;gap:9px;flex-wrap:wrap}.summary-item{font-size:12px;padding:9px 12px;background:#fffdf5;border-radius:8px;color:#87907a}.summary-item b{font-weight:500;color:#485640}.selected{display:none;font-weight:700;color:#698249}.notice{border-left:3px solid #a9b797;padding-left:14px;margin:22px 0 32px}@media(min-width:1500px){.items{grid-template-columns:repeat(4,minmax(0,1fr))}main{max-width:1750px}}@media(max-width:1050px){.items{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){main{padding:24px 14px}.items{grid-template-columns:1fr}h1{font-size:28px}nav{padding:10px;gap:5px}a{padding:8px 10px;font-size:11px}}${rules}
</style></head><body><nav>${groups.map((name,i)=>`<a href="#group-${i}">${name}</a>`).join('')}<a href="#summary">查看选择</a></nav><main><div class="eyebrow">ISLAND / FOOD ICON STUDIES</div><h1>剩余食物，两款挑选</h1><p>${items.length} 种食物 · ${items.length*2} 个原创 SVG · 放大图与背包尺寸对照</p><div class="notice"><p>沿用柔和黏土配色。左右方案比较轮廓、切面和摆放，点击即可选中，页尾汇总可复制。<br>已定稿的虾、墨鱼及上一批 21 项不重复；本页仅供本地选型，确定后再应用到游戏。</p></div>${sections}<section id="summary"><h2>你的选择</h2><p>可以直接回复“全选 1”，或“苹果 2、羊奶 1……”；也可以复制下面的选择汇总。</p><div class="summary">${summary}</div></section></main></body></html>`;
writeFileSync('public/remaining-food-icon-selection.html',html);
console.log(`Generated ${items.length} foods, ${items.length*2} choices: public/remaining-food-icon-selection.html`);
