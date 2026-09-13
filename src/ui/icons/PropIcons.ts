import type { ResourceKind } from '@/game/systems/Inventory';
import { path as p, line as l, ellipse as e, rect as r, group as g, claySvg as svg } from './SvgPaths';
const wood = '#b88a60', dark = '#785b45', cream = '#f4dfb5', green = '#93b879', metal = '#87aaa6';
const barrel = (color: string) => p('M17 17Q11 34 18 53Q32 59 47 53Q53 34 47 17Z',color,dark) + l('M24 22L23 49M39 22L41 49',dark,1.5) + r(15,25,34,5,2,metal) + r(16,45,32,5,2,metal) + e(32,17,15,6,cream) + e(32,17,11,3,dark);
const seed = (color: string, shape: string) => e(26,43,12,13,wood)+e(23,39,5,7,cream)+l('M27 31Q24 21 30 13','#668e62',3)+p('M28 20Q10 20 15 12Q28 11 28 20M29 16Q36 5 44 11Q42 20 29 16',green)+g('translate(38 35)',p(shape,color,dark,1));
const round='M0 8C0 -4 18 -4 18 8C18 23 0 23 0 8Z';
export const PROP_SVG = {
 oakSeed:svg(seed('#b79164',round)),pineSeed:svg(seed('#a68969','M9 0L19 15L10 22L0 15Z')),fruitSeed:svg(seed('#cb8579',round)),
 reviveStone:svg(p('M13 33L25 12L42 14L54 35L36 54L18 48Z',metal)+p('M25 12L42 14L34 33L13 33Z','#cde0ce')+p('M34 33L54 35L36 54Z','#648c89')+l('M31 24V41M24 32H39',cream,4)),
 lasso:svg(l('M41 39Q58 25 43 14Q23 3 14 22Q8 40 30 43Q44 46 44 54H21',wood,6)+l('M40 35Q52 25 41 17Q25 8 17 23',cream,2)+r(32,37,10,6,2,dark)),
 letter:svg(p('M16 11H47L44 49H20Q9 48 12 41H19Z',cream,dark)+p('M16 11Q9 8 10 18H18M44 41H52Q55 51 44 49',wood)+l('M24 20H39M23 26H36M23 32H32',wood,2)+e(39,38,7,7,'#c58576')+l('M39 33V42M35 34V37H43V34',cream,1.5)),
 arrow:svg(l('M13 52L46 16',wood,4)+p('M40 17L52 7L51 23L46 19Z',metal)+p('M14 42L7 46L8 55L18 55L23 46L16 48Z','#bd847c')+l('M15 49L44 18',cream,1)),
 bait:svg(e(32,50,20,5,dark)+[ [22,42],[40,42],[31,31] ].map(([x,y])=>e(x,y,9,8,'#caa378')+e(x-2,y-2,3,2,cream)).join('')),
 endlessQuiver:svg(l('M23 30L20 8M33 30L35 6M40 30L49 12',wood,3)+p('M16 7L20 17L25 9M30 6L35 16L40 6M45 10L46 20L54 14',green)+p('M17 24L45 28L42 53Q28 61 22 49Z',wood)+l('M20 30L44 34',cream,4)+l('M27 43C23 35 39 35 36 43C34 49 26 36 24 42C22 49 35 49 36 43',cream,2)),
 endlessBait:svg(barrel('#9aaa80')+l('M24 38C20 30 39 31 38 38C36 45 26 30 24 38C21 45 38 45 38 38',cream,2)),
 bottle:svg(p('M25 8H38V21Q49 25 48 38L45 52Q32 59 18 51L16 37Q16 25 25 21Z','#a3c5b2', '#719b91')+r(25,6,13,9,2,wood)+g('rotate(12 32 37)',r(24,28,15,22,3,cream)+l('M28 34H36M28 39H35',wood,1.5))+l('M21 29L20 41','#e4edd6',3)),
} satisfies Partial<Record<ResourceKind,string>>;
