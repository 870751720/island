import { claySvg as svg, path as p, line as l, ellipse as e, rect as r } from './SvgPaths';

/** 菜单与场景提示共用的静态黏土图稿。 */
export const MENU_SVG = {
 book: svg(p('M7 15Q20 10 32 19Q44 10 57 15V50Q44 45 32 53Q20 45 7 50Z','#b38d66') + p('M10 12Q21 10 32 17Q43 10 54 12V45Q43 43 32 49Q21 43 10 45Z','#f0dbb2') + l('M32 18V47M16 22L26 25M16 30L26 33M38 25L48 22M38 33L48 30','#bd9a71',2)),
 music: svg(l('M26 44V17L49 12V39','#8bad9c',6) + l('M27 23L48 18','#c1d2b3',4) + e(19,46,10,7,'#b58c69') + e(42,41,10,7,'#b58c69')),
 sound: svg(p('M10 25H22L38 13V52L22 40H10Z','#c4a276') + p('M22 25L34 18V47L22 39Z','#ead2a9') + l('M44 23Q53 32 44 41M50 15Q65 32 50 49','#81aaa0',4)),
 camera: svg(r(7,20,50,32,7,'#94b1a2') + r(18,12,19,12,4,'#b2c5af') + e(33,35,14,14,'#ead8b2') + e(33,35,10,10,'#678b8b') + e(30,32,4,4,'#b9dad1') + r(46,25,6,4,2,'#f6d8a2')),
 gift: svg(r(12,25,40,31,4,'#b1bea1') + r(8,21,48,11,3,'#d1d5b2') + r(28,21,8,35,2,'#cb9877') + p('M31 22C8 22 14 2 26 12L32 21C51 0 61 24 33 22Z','#e3b491','#b88968',2)),
 upgrade: svg(p('M10 31L32 9L54 31H42V52H22V31Z','#92b3a0','#6e917e',2) + l('M22 25L32 15L42 25','#dce4bd',3)),
 skull: svg(p('M12 33C8 3 56 3 53 33L47 43V53H19V43Z','#e6d5b2','#b49c80',2) + e(23,31,7,8,'#836e5c') + e(43,31,7,8,'#836e5c') + p('M32 36L27 43H37Z','#ae9377') + l('M27 48V54M36 48V54','#b49c80',2) + l('M19 19Q25 14 32 16','#fff0d1',3)),
 bite: svg(p('M31 6L38 20L53 14L47 30L59 39L43 42L42 57L30 47L16 56L18 40L5 32L21 27L17 12Z','#e4bc80') + l('M33 20V35','#997050',5) + e(33,43,3,3,'#997050')),
};
export function MenuIcon({ name, size = 22 }: { name: keyof typeof MENU_SVG; size?: number | string }) {
 return <span aria-hidden="true" style={{display:'inline-block',width:size,height:size,verticalAlign:'middle',flexShrink:0,lineHeight:0}} dangerouslySetInnerHTML={{__html:MENU_SVG[name]}} />;
}
