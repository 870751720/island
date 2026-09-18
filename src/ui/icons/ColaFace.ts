const ellipse=(x:number,y:number,rx:number,ry:number,color:string)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${color}"/>`;
const path=(d:string,color:string)=>`<path d="${d}" fill="${color}"/>`;
const line=(d:string)=>`<path d="${d}" fill="none" stroke="#292632" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Shared smile artwork for the companion icon and upright tent cameo. */
export function colaFaceContent(clip: string): string {
  const white='#fff4e5', gray='#737583', ink='#292632';
  const face='M7 31C7 17 20 15 32 16C44 15 57 17 57 31C63 48 50 58 32 58C14 58 1 48 7 31Z';
  const ears='M10 29L12 9Q13 5 17 9L27 21H37L47 9Q51 5 52 9L54 29Z';
  const eyes=line('M15 35Q21 26 27 35M37 35Q43 26 49 35');
  const mouth=path('M27 46Q32 48 37 46Q36 54 32 54Q28 54 27 46',ink)+ellipse(32,51.5,3.1,1.9,'#e5a0ac');
  return `<defs><clipPath id="${clip}">${path(face,white)}</clipPath></defs><g>${path(ears,gray)}${path('M16 23L16 13L25 25M40 25L48 13L49 23','#e4a3ad')}${path(face,white)}<g clip-path="url(#${clip})">${path('M3 15H30Q29 24 26 29L17 38L5 35ZM34 15H61L59 36L47 38L37 27Z',gray)}</g>${ellipse(18,44,10,7,white)}${ellipse(46,44,10,7,white)}${eyes}${ellipse(21,22.5,3,1.15,'#aaa6ac')}${ellipse(43,22.5,3,1.15,'#aaa6ac')}${ellipse(13,43,3.8,1.7,'#efb9b8')}${ellipse(51,43,3.8,1.7,'#efb9b8')}${path('M28 41Q32 39 36 41Q35 45 32 45Q29 45 28 41',ink)}${ellipse(26.5,45.5,2.5,1.9,gray)}${ellipse(37.5,45.7,1.8,2.3,gray)}${ellipse(41,48,1.7,1.2,gray)}${mouth}<path d="M13 44L4 42M13 47L4 48M51 44L60 42M51 47L60 48" stroke="#b3a9aa" stroke-width=".85" stroke-linecap="round"/></g>`;
}
