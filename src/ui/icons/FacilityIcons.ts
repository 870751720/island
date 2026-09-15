import type { ResourceKind } from '@/game/systems/Inventory';
import { path as p, line as l, ellipse as e, rect as r, group as g, claySvg as svg } from './SvgPaths';
const wood = '#b88a60', dark = '#785b45', cream = '#f4dfb5', green = '#93b879', metal = '#87aaa6';
const base = () => r(12,48,40,7,3,'#8a9890') + r(17,43,30,7,2,'#bac5af');
const flame = () => p('M32 12Q35 24 43 29Q50 44 33 47Q16 46 22 32L28 22L28 33Q34 28 32 12Z','#e79a61') + p('M33 30Q43 43 32 44Q25 42 33 30',cream);
const barrel = (color: string) => p('M17 17Q11 34 18 53Q32 59 47 53Q53 34 47 17Z',color,dark) + l('M24 22L23 49M39 22L41 49',dark,1.5) + r(15,25,34,5,2,metal) + r(16,45,32,5,2,metal) + e(32,17,15,6,cream) + e(32,17,11,3,dark);
const chest = (iron: boolean) => p('M10 25L37 18L54 26V50L27 56L10 47Z',iron?metal:wood,dark) + p('M10 25L27 32L54 26L37 18Z',iron?'#c4d7c9':cream) + l('M27 32V55M11 37L27 43L53 37',dark) + r(31,36,7,9,2,'#e4c684');
const bed = (level: number) => r(9,23,5,32,2,dark)+r(49,35,5,22,2,dark)+p('M12 29L33 22L53 35V47L31 55L12 43Z',wood)+p('M13 29L33 24L51 35L31 43Z',[cream,'#d9b08b','#a7c5b3'][level-1])+p('M14 29L24 26L33 32L23 36Z','#fff0d4')+p('M27 32L36 28L50 36L31 43V51L26 48Z',[green,'#ad7e60','#739c98'][level-1])+(level===3?l('M14 28V13M48 33V18',dark,4):'');
const bench = (level: number) => r(12,32,6,24,2,dark)+r(46,30,6,25,2,dark)+r(16,44,32,4,1,wood)+p('M7 26L40 19L57 29L23 38L7 32Z',wood,dark)+p('M8 26L40 19L56 29L23 34Z',cream)+g('translate(0 -4)',l('M25 29L40 17',dark,4)+p('M35 15L41 11L48 17L42 22Z',metal))+(level>1?r(15,37,7,6,1,metal)+r(44,35,7,6,1,metal):'')+(level>2?r(30,36,11,9,2,metal)+e(35,40,2,2,cream):'')+(level===4?p('M12 19V10H16V19M12 13H25V17H16',metal):'');
const fence = (gate: boolean) => [11,47,...(gate?[]:[29])].map(x=>p(`M${x} 53V17L${x+4} 10L${x+8} 17V53Z`,wood,dark,1)).join('')+r(9,25,46,6,2,cream)+r(9,42,46,6,2,wood)+(gate?l('M18 40L43 29M32 26V47',dark,3)+e(35,36,2,2,cream):'');
const bush = (berries: boolean) => e(32,51,18,5,dark)+p('M10 42Q4 29 18 25Q17 12 30 17Q42 8 47 23Q61 25 54 43Q36 53 10 42Z',green)+p('M13 39Q31 45 52 35Q52 51 23 48Z','#668e62')+l('M18 25Q24 19 29 23',cream,3)+(berries?[ [20,32],[35,27],[43,38],[29,41] ].map(([x,y])=>e(x,y,4,4,'#cc7b75')+e(x-1,y-1,1,1,cream)).join(''):'');
const seed = (color: string, shape: string) => e(26,43,12,13,wood)+e(23,39,5,7,cream)+l('M27 31Q24 21 30 13','#668e62',3)+p('M28 20Q10 20 15 12Q28 11 28 20M29 16Q36 5 44 11Q42 20 29 16',green)+g('translate(38 35)',p(shape,color,dark,1));
const round='M0 8C0 -4 18 -4 18 8C18 23 0 23 0 8Z';
export const FACILITY_SVG = {
 gravelPath:svg(p('M8 38L29 13L57 27L37 54Z','#918775') + [[22,32],[31,23],[42,29],[32,37],[40,44],[17,40]].map(([x,y],i)=>p(`M${x-5} ${y}L${x-2} ${y-4}L${x+5} ${y-2}L${x+6} ${y+3}L${x} ${y+5}Z`,['#bcb29b','#85877f','#aca99b'][i%3],'#777a75',1)).join('')),
 poseidonBlessing:svg(base()+l('M32 45V10M20 12V23Q32 32 44 23V12',metal,6)+p('M26 13L32 5L38 13M14 15L20 7L25 15M39 15L44 7L50 15',cream)),
 beehiveShrine:svg(base()+p('M15 40Q13 24 23 22Q21 14 32 13Q43 14 42 22Q52 26 49 40Z','#d6ac64')+l('M22 23H42M18 30H46M17 37H47',cream,3)+e(33,39,5,6,dark)),
 healCrystal:svg(base()+p('M20 35L23 13L33 5L44 18L42 37L32 46Z','#cf92a9')+p('M23 13L33 5L31 35L20 35Z','#f3c9cf')+p('M31 35L44 18L42 37L32 46Z','#a76f90')),
 rainAltar:svg(base()+p('M12 30Q32 22 52 30Q49 45 32 46Q15 43 12 30',metal)+e(32,30,20,6,'#d7dfca')+e(32,30,15,3,'#77b8c7')+p('M32 6Q18 22 32 23Q46 22 32 6','#89c4d1')+l('M29 15L28 18',cream,3)),
 crocIncense:svg(base()+p('M15 35H49Q47 47 32 47Q17 47 15 35',wood)+e(32,35,17,5,cream)+l('M32 33L36 16',dark,3)+l('M37 15Q24 10 36 5','#bac5af',3)),
 crate:svg(chest(false)),ironCrate:svg(chest(true)),baitBarrel:svg(barrel(wood)+p('M24 37Q32 29 40 37Q33 44 24 37',cream)+e(28,36,1,1,dark)),brewBarrel:svg(barrel('#aa7b60')+e(32,37,6,6,'#ad7185')+p('M31 31Q33 25 40 28Q39 33 31 31',green)),
 waterPurifier:svg(r(14,12,5,43,2,dark)+r(45,12,5,43,2,dark)+p('M10 16H54L45 32H19Z',metal)+e(32,16,22,5,cream)+e(32,16,17,2,'#b5d5d3')+p('M32 33Q23 44 32 45Q41 44 32 33','#79b7cc')+p('M19 46H45L42 55H22Z',metal)),
 smelter:svg(p('M11 53V30L21 18V8H41V18L53 30V53Z','#a5ada2')+r(22,8,20,8,2,'#d0d5bf')+p('M20 51V36Q32 24 44 36V51Z',dark)+g('translate(12 23) scale(.6)',flame())+l('M13 28H22M42 27H48M13 38H17',cream,3)),
 loom:svg(r(12,9,5,47,2,dark)+r(47,9,5,47,2,dark)+r(9,13,46,6,2,wood)+r(9,46,46,6,2,wood)+[22,27,32,37,42].map(x=>l(`M${x} 20V46`,cream,2)).join('')+r(20,29,24,15,2,green)+l('M21 34H43M21 39H43',cream,1)+p('M20 24L44 20L46 24L22 28Z',wood)),
 deadCampfire:svg(l('M16 50L47 39M17 39L48 51','#78675b',7)+e(32,50,9,3,'#aca89a')),
 campfire:svg(l('M16 51L48 42M17 42L47 53',dark,7)+flame()),
 cookingStation:svg(r(12,39,8,16,2,dark)+r(45,39,8,16,2,dark)+g('translate(13 27) scale(.55)',flame())+p('M12 24H52Q53 43 32 44Q12 42 12 24',metal)+e(32,24,20,6,cream)+e(32,24,15,3,'#ceac70')+l('M9 27H5M55 27H59',dark,4)+l('M26 16Q20 12 26 7M38 16Q32 12 38 7','#c7c8b6',2)),
 fenceWood:svg(fence(false)),fenceGate:svg(fence(true)),fenceStone:svg([ [8,16,21],[31,16,24],[6,29,15],[23,29,20],[45,29,13],[8,42,22],[32,42,23] ].map(([x,y,w])=>r(x,y,w,12,4,'#a0b1a5')+l(`M${x+4} ${y+3}H${x+w-5}`,'#d9dfc9',2)).join('')),
 bed1:svg(bed(1)),bed2:svg(bed(2)),bed3:svg(bed(3)),workbench1:svg(bench(1)),workbench2:svg(bench(2)),workbench3:svg(bench(3)),workbench4:svg(bench(4)),
 torch:svg(g('rotate(18 32 32)',r(28,28,8,28,3,wood)+r(25,25,14,11,3,dark)+g('translate(10 -2) scale(.7)',flame())+l('M28 30H36',cream,2))),
 berryBush:svg(bush(true)),shrubBush:svg(bush(false)),grassTuft:svg(e(32,50,19,6,dark)+p('M19 48L10 20Q25 22 27 42L29 10Q42 18 35 43L53 21Q54 42 43 49Z',green)+l('M31 46L33 24M24 45L19 32','#d1d7a0',2)),
 wormNest:svg(e(32,46,23,10,wood)+e(32,41,16,7,dark)+l('M16 48Q28 56 48 46M12 43L19 45',cream,2)+l('M26 42Q20 25 30 28Q37 30 32 39Q38 43 43 36','#d49a87',5)),
 carrotSeed:svg(seed('#df9c6e','M0 0H17L6 22Z')),wheatSeed:svg(seed('#d9be7a','M9 0Q24 12 9 22Q-6 12 9 0')),
 potatoSeed:svg(seed('#c6a180',round)),sweetPotatoSeed:svg(seed('#bc817b','M0 17Q-2 0 18 1Q20 16 0 17')),
 cornSeed:svg(seed('#e0be73','M4 0H13Q21 12 13 22H4Q-3 12 4 0')),soybeanSeed:svg(seed('#abb17c','M0 9Q1 -3 10 2Q22 -3 19 10Q13 22 0 9')),
 tomatoSeed:svg(seed('#d58978',round)),pepperSeed:svg(seed('#bd766a','M0 0H14Q21 16 1 22Q10 12 0 0')),
 eggplantSeed:svg(seed('#9c829d','M4 0H12L19 15Q15 25 5 19Z')),strawberrySeed:svg(seed('#d08289','M0 4Q8 -3 18 4L12 22L5 18Z')),
 cabbageSeed:svg(seed('#88ad81',round)+l('M40 46L47 52L52 42','#d4dfaf',2)),pumpkinSeed:svg(seed('#d5a16d',round)+l('M46 37V52',cream,2)),
} satisfies Partial<Record<ResourceKind,string>>;
