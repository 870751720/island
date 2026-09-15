import type { BuffId } from '@/game/systems/BuffSystem';
import { claySvg, path, line, ellipse } from './SvgPaths';
import { FACILITY_SVG } from './FacilityIcons';

const heart = path('M32 53C22 45 8 36 10 23C12 11 27 10 32 20C38 10 53 12 55 24C57 37 42 47 32 53Z','#db827c') + line('M17 24Q20 18 26 22','#ffd9bd',4);
const drop = path('M32 9C29 18 14 31 14 42A18 18 0 0 0 50 42C50 31 36 18 32 9Z','#74b6c6') + line('M23 34Q18 43 25 48','#d8f4eb',4);
const cloud = path('M13 35C3 31 9 18 20 22C24 9 42 12 45 23C57 19 62 35 51 38H15Z','#c5d9ce');
export const VITAL_SVG = {
 health: claySvg(heart),
 hunger: claySvg(ellipse(32,35,23,18,'#c39259') + ellipse(32,31,22,15,'#efd29a') + line('M23 22L19 30M33 20L29 29M43 23L39 32','#bd8a56',3)),
 thirst: claySvg(drop),
};
export const BUFF_SVG: Record<BuffId,string> = {
 gravelPath: FACILITY_SVG.gravelPath,
 poseidon: FACILITY_SVG.poseidonBlessing,
 beehive: FACILITY_SVG.beehiveShrine,
 healCrystal: claySvg(heart + line('M32 27V41M25 34H39','#fff2d7',4)),
 rainAltar: FACILITY_SVG.rainAltar,
 rainBlessing: claySvg(cloud + line('M20 44L16 51M33 44L29 53M46 44L42 51','#6aafc6',4)),
 windBlessing: claySvg(line('M10 25H39C54 25 51 10 41 15M15 34H49M10 43H35C49 43 45 57 37 52','#80b8a9',5)),
 snowBlessing: claySvg(line('M32 11V53M14 21L50 43M14 43L50 21M26 14L32 20L38 14M26 50L32 44L38 50M14 28L22 26L21 18M43 46L42 38L50 36','#94bfce',4)),
 bearSlow: claySvg(ellipse(33,40,18,14,'#a58266') + ellipse(16,23,6,8,'#c39c78') + ellipse(30,17,6,8,'#c39c78') + ellipse(44,20,6,8,'#c39c78') + ellipse(53,31,5,7,'#c39c78') + line('M17 48L48 18','#e4b16d',4)),
 refresh: claySvg(path('M18 13H47L42 35Q32 47 22 35Z','#8fbca5') + line('M32 41V53M23 54H41','#a6805c',4) + line('M24 20H40','#e6eed1',3)),
 tipsy: claySvg(ellipse(32,32,23,24,'#edc28b') + line('M15 28C15 18 28 20 26 28C24 35 17 32 20 27M37 28C37 18 50 20 48 28C46 35 39 32 42 27M25 44Q32 38 40 44','#836349',3)),
};
export function StatusIcon({ markup, size = 20 }: { markup: string; size?: number }) {
 return <span aria-hidden="true" style={{display:'inline-block',width:size,height:size,flexShrink:0,lineHeight:0}} dangerouslySetInnerHTML={{__html:markup}} />;
}
