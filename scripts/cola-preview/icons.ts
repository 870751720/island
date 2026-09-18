import { variants } from './variants';

const ellipse=(x:number,y:number,rx:number,ry:number,color:string)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${color}"/>`;
const path=(d:string,color:string)=>`<path d="${d}" fill="${color}"/>`;
let iconId=0;

export function icon(index:number):string {
  const {white,gray}=variants[index],ink='#292632';
  const face=index===0?'M7 31C7 17 20 15 32 16C44 15 57 17 57 31C63 48 50 58 32 58C14 58 1 48 7 31Z':index===1?'M10 29Q10 14 32 16Q54 14 54 29Q60 45 44 53Q32 62 20 53Q4 45 10 29Z':'M9 27Q13 15 32 17Q51 15 55 27L58 32L55 36L62 40L55 44L59 48L48 52Q32 62 16 52L5 48L9 44L2 40L9 36L6 32Z';
  const ears=index===1?'M11 30L7 5Q8 1 12 4L27 21H37L52 4Q56 1 56 6L54 30Z':'M10 29L12 9Q13 5 17 9L27 21H37L47 9Q51 5 52 9L54 29Z';
  const eyeY=index===0?34:32, radius=index===0?7.1:6.5;
  const eyes=[21,43].map(x=>ellipse(x,eyeY,radius+.7,radius+1,ink)+ellipse(x,eyeY,radius,radius+.3,'#d5b367')+ellipse(x,eyeY-.7,radius*.82,radius*.9,ink)+ellipse(x-2,eyeY-2.5,2.05,2.15,'#fffdf4')+ellipse(x+2.3,eyeY+2,1,1,'#fff2c9')).join('');
  const mouth=index===0?'<path d="M32 44V47Q29 51 26 47M32 47Q35 51 38 47" stroke="#292632" stroke-width="1.4" stroke-linecap="round" fill="none"/>':path('M27 45Q32 48 37 45Q38 54 32 54Q26 54 27 45',ink)+ellipse(32,51.5,3.3,2.1,'#e5a0ac');
  const clip=`cola-face-${index}-${iconId++}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><clipPath id="${clip}">${path(face,white)}</clipPath></defs><g transform="rotate(${index===1?-10:index===2?8:0} 32 33)">${path(ears,gray)}${path(index===1?'M13 21L11 9L24 24M41 24L52 9L50 22':'M16 23L16 13L25 25M40 25L48 13L49 23','#e4a3ad')}${path(face,white)}<g clip-path="url(#${clip})">${path('M3 15H30Q29 24 26 29L17 38L5 35ZM34 15H61L59 36L47 38L37 27Z',gray)}</g>${ellipse(18,44,10,7,white)}${ellipse(46,44,10,7,white)}${eyes}${ellipse(21,22.5,3,1.15,'#aaa6ac')}${ellipse(43,22.5,3,1.15,'#aaa6ac')}${ellipse(13,43,3.8,1.7,'#efb9b8')}${ellipse(51,43,3.8,1.7,'#efb9b8')}${path('M28 41Q32 39 36 41Q35 45 32 45Q29 45 28 41',ink)}${ellipse(26.5,45.5,2.5,1.9,gray)}${ellipse(37.5,45.7,1.8,2.3,gray)}${ellipse(41,48,1.7,1.2,gray)}${mouth}<path d="M13 44L4 42M13 47L4 48M51 44L60 42M51 47L60 48" stroke="#b3a9aa" stroke-width=".85" stroke-linecap="round"/></g></svg>`;
}
