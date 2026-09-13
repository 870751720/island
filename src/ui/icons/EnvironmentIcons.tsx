import { claySvg as svg, path as p, line as l, ellipse as e } from './SvgPaths';
import { BUFF_SVG } from './StatusIcons';
const sun = e(32,30,14,14,'#e8bc77') + l('M32 7V11M32 49V53M9 30H13M51 30H55M16 14L19 18M46 44L49 47M16 46L19 43M46 17L49 14','#cda36a',3);
const horizon = l('M9 43H55M17 50H47','#86afa1',3);
const ENVIRONMENT_SVG = {
 sunny: svg(sun), summer: svg(sun), noon: svg(sun),
 rain: BUFF_SVG.rainBlessing, snow: BUFF_SVG.snowBlessing, winter: BUFF_SVG.snowBlessing, wind: BUFF_SVG.windBlessing,
 spring: svg(l('M32 35V56M32 49Q19 48 17 41','#8daa85',4) + e(23,20,9,10,'#db9d93') + e(41,20,9,10,'#e6b1a0') + e(20,35,9,10,'#e6b1a0') + e(43,35,9,10,'#db9d93') + e(32,40,9,10,'#e7b9a1') + e(32,28,8,8,'#efd293')),
 autumn: svg(p('M49 10Q12 6 13 36Q13 54 32 49Q53 44 49 10Z','#ce9c70') + l('M15 55L42 19M25 41L24 27M33 32L43 32','#f0d1a0',3)),
 auto: svg(l('M13 29A20 20 0 0 1 48 16M51 35A20 20 0 0 1 16 48','#91afa0',5) + p('M39 17L51 10L53 24Z','#c6a57b') + p('M25 47L13 54L11 40Z','#c6a57b')),
 midnight: svg(p('M40 9C16 8 9 35 24 49C35 60 52 50 55 40C34 49 23 25 40 9Z','#cfbe93') + p('M48 13L50 19L56 21L50 23L48 29L46 23L40 21L46 19Z','#ebd4a2')),
 dawn: svg(p('M17 40A15 15 0 0 1 47 40Z','#e9c788') + l('M32 11V20M12 24L18 29M52 24L46 29','#dcba7b',3) + horizon),
 dusk: svg(p('M17 40A15 15 0 0 1 47 40Z','#ce9a7f') + l('M32 11V20M12 24L18 29M52 24L46 29','#bf9680',3) + horizon),
};
export function EnvironmentIcon({ name }: { name: keyof typeof ENVIRONMENT_SVG }) {
 return <span aria-hidden="true" style={{display:'inline-block',width:20,height:20,verticalAlign:'middle',lineHeight:0}} dangerouslySetInnerHTML={{__html:ENVIRONMENT_SVG[name]}} />;
}
