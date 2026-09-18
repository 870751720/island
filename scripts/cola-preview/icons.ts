import { variants } from './variants';

const ellipse=(x:number,y:number,rx:number,ry:number,color:string)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${color}"/>`;
const path=(d:string,color:string)=>`<path d="${d}" fill="${color}"/>`;
let iconId=0;
export const iconOptions = [
  {name:'A · 歪头比心', note:'原 A 圆脸，右倾 13°、左上爱心，与薯条成对'},
  {name:'B · 眨眼撒娇', note:'一只金色圆眼、一只俏皮眨眼，伸出小舌头'},
  {name:'C · 弯眼甜笑', note:'两只弯弯笑眼、小小开心嘴，软乎乎的亲近感'},
];
const line=(d:string)=>`<path d="${d}" fill="none" stroke="#292632" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;


export function icon(index:number, paired = true):string {
  const {white,gray}=variants[0],ink='#292632';
  const face='M7 31C7 17 20 15 32 16C44 15 57 17 57 31C63 48 50 58 32 58C14 58 1 48 7 31Z';
  const ears='M10 29L12 9Q13 5 17 9L27 21H37L47 9Q51 5 52 9L54 29Z';
  const eyeY=34, radius=7.1;
  const openEye=(x:number)=>ellipse(x,eyeY,radius+.7,radius+1,ink)+ellipse(x,eyeY,radius,radius+.3,'#d5b367')+ellipse(x,eyeY-.7,radius*.82,radius*.9,ink)+ellipse(x-2,eyeY-2.5,2.05,2.15,'#fffdf4')+ellipse(x+2.3,eyeY+2,1,1,'#fff2c9');
  const eyes=index===0?[21,43].map(openEye).join(''):index===1?openEye(21)+line('M38 30Q44 33 48 35Q43 35 38 38'):line('M15 35Q21 26 27 35M37 35Q43 26 49 35');
  const mouth=index===0?'<path d="M32 44V47Q29 51 26 47M32 47Q35 51 38 47" stroke="#292632" stroke-width="1.4" stroke-linecap="round" fill="none"/>':index===1?path('M26 45Q32 49 38 45Q37 52 32 53Q27 52 26 45',ink)+path('M29 49Q32 47 35 49L35 54Q32 58 29 54Z','#e5a0ac'):path('M27 46Q32 48 37 46Q36 54 32 54Q28 54 27 46',ink)+ellipse(32,51.5,3.1,1.9,'#e5a0ac');
  const clip=`cola-face-${index}-${iconId++}`;
  const tilt = paired ? 13 : 0;
  const heart = paired ? `<g transform="translate(64 0) scale(-1 1)">${path('M51 8Q54 3 57 7Q62 4 62 9L56 15Z','#e89bad')}</g>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><clipPath id="${clip}">${path(face,white)}</clipPath></defs><g transform="rotate(${tilt} 32 32)">${path(ears,gray)}${path('M16 23L16 13L25 25M40 25L48 13L49 23','#e4a3ad')}${path(face,white)}<g clip-path="url(#${clip})">${path('M3 15H30Q29 24 26 29L17 38L5 35ZM34 15H61L59 36L47 38L37 27Z',gray)}</g>${ellipse(18,44,10,7,white)}${ellipse(46,44,10,7,white)}${eyes}${ellipse(21,22.5,3,1.15,'#aaa6ac')}${ellipse(43,22.5,3,1.15,'#aaa6ac')}${ellipse(13,43,3.8,1.7,'#efb9b8')}${ellipse(51,43,3.8,1.7,'#efb9b8')}${path('M28 41Q32 39 36 41Q35 45 32 45Q29 45 28 41',ink)}${ellipse(26.5,45.5,2.5,1.9,gray)}${ellipse(37.5,45.7,1.8,2.3,gray)}${ellipse(41,48,1.7,1.2,gray)}${mouth}<path d="M13 44L4 42M13 47L4 48M51 44L60 42M51 47L60 48" stroke="#b3a9aa" stroke-width=".85" stroke-linecap="round"/></g>${heart}</svg>`;
}
