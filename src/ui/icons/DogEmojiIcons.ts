import { DOG_COMBAT_SVG } from './DogCombatIcons';
import { path as p, line as l, ellipse as e, claySvg as svg } from './SvgPaths';
const heart=p('M32 51L12 31Q2 12 20 13Q28 13 32 21Q41 6 53 16Q64 31 32 51','#d48e91')+l('M16 22Q20 17 24 22','#f7d1c4',3);
const face=(mood: 'happy'|'love'|'surprise'|'hungry')=>e(32,33,24,23,'#dfb987')+p('M10 24L10 7L25 15M39 15L54 7L54 26','#b68d68')+p('M15 20L15 13L22 17M43 17L50 13L50 21','#e4bbab')+e(32,41,15,12,'#f5e4c3')+(mood==='love'?gHeart(12,22)+gHeart(36,22):mood==='happy'?l('M19 29Q23 24 27 29M38 29Q42 24 46 29','#685447',2.5):e(23,28,2.5,3,'#685447')+e(41,28,2.5,3,'#685447'))+p('M27 35Q32 32 37 35L32 40Z','#685447')+(mood==='surprise'?e(32,45,4,5,'#685447'):l('M25 43Q32 49 39 43','#685447',2))+(mood==='hungry'?p('M33 45H41Q44 54 37 53Z','#cf8e8a'):'');
function gHeart(x:number,y:number){return `<g transform="translate(${x} ${y}) scale(.25)">${heart}</g>`;}
export const DOG_EMOJI_SVG: Readonly<Record<string,string>> = {
 ...DOG_COMBAT_SVG,
 '🐕':svg(face('happy')),'😊':svg(face('happy')),'🥰':svg(face('love')),'😮':svg(face('surprise')),'😋':svg(face('hungry')),
 '❤️':svg(heart),
 '🐾':svg(p('M18 39Q22 29 32 33Q42 29 47 40Q54 55 39 53Q32 49 25 53Q10 55 18 39','#b28c70')+e(13,29,6,8,'#d4b08b')+e(25,19,6,8,'#d4b08b')+e(40,19,6,8,'#d4b08b')+e(51,30,6,8,'#d4b08b')),
 '🎾':svg(e(32,32,24,24,'#a9be7e')+p('M12 45Q33 56 52 35Q49 59 29 56Z','#7f9b65')+l('M13 14Q35 28 13 49M50 13Q30 28 51 49','#f6e9c4',3)),
 '🦴':svg(p('M20 17Q11 4 6 16Q2 24 14 28L35 46Q34 59 45 56Q53 57 52 48Q63 42 55 35Q47 28 43 38L23 23Q27 12 20 17Z','#eedab5','#b99b77')+l('M21 28L37 41','#fff3d4',3)),
 '✨':svg(p('M32 6L38 24L56 31L39 38L32 56L25 38L8 31L25 24Z','#e5c482')+p('M32 13V32H16L27 26Z','#fff0c5')+p('M51 4L54 11L61 14L54 17L51 24L48 17L41 14L48 11Z','#c3d4b0')),
 '❓':svg(l('M19 20Q19 7 33 8Q50 9 47 24Q45 29 33 34V40','#c69d7e',8)+e(33,52,5,5,'#c69d7e')+l('M23 17Q27 11 34 13','#f9e4c1',2)),
 '💤':svg(l('M9 34H26L10 51H28M29 19H44L30 34H46M44 7H56L45 17H57','#94aaa9',4)),
};
