import { COLA_ICON } from '../icons/ColaIcon';
import { DOG_EMOJI_SVG } from '../icons/DogEmojiIcons';
import { claySvg as svg, ellipse as e, path as p, line as l } from '../icons/SvgPaths';
import type { CreatureId } from './creatureWiki';
import styles from './WikiPanel.module.css';

const eyes = e(24, 32, 2.2, 2.8, '#38463e') + e(40, 32, 2.2, 2.8, '#38463e');
const muzzle = (color: string) => e(32, 43, 12, 9, color) + p('M28 39Q32 37 36 39L32 43Z', '#584c45') + l('M32 43V46M27 47Q32 51 37 47', '#584c45', 1.5);
const face = (color: string) => e(32, 34, 22, 21, color);
/** 复用黏土 SVG 笔触与伙伴头像，不创建额外 WebGL 场景。 */
const ICONS: Record<CreatureId, string> = {
  rabbit: svg(e(22, 17, 7, 16, '#d5bfa3') + e(42, 17, 7, 16, '#d5bfa3') + e(22, 15, 3, 11, '#dba6a0') + e(42, 15, 3, 11, '#dba6a0') + face('#ead9bd') + eyes + muzzle('#f8ebd1')),
  sheep: svg(e(12, 31, 10, 6, '#b19b81') + e(52, 31, 10, 6, '#b19b81') + face('#bca58b') + [15, 24, 34, 44, 50].map((x) => e(x, 19, 9, 10, '#f4ecd7')).join('') + eyes + muzzle('#dbcaac')),
  bison: svg(p('M17 23Q5 18 10 6Q12 17 24 15M47 23Q59 18 54 6Q52 17 40 15', '#dfcda8') + e(11, 28, 10, 6, '#986c4b') + e(53, 28, 10, 6, '#986c4b') + face('#a97c56') + eyes + e(32, 45, 17, 11, '#d5ad81') + e(26, 45, 2.5, 2, '#705443') + e(38, 45, 2.5, 2, '#705443')),
  wolf: svg(p('M12 29L8 4L28 18L38 18L56 4L52 31', '#83928c') + face('#9ba59a') + p('M12 39L24 43L32 55L41 43L52 39Q47 61 32 58Q15 56 12 39', '#e3dfc9') + eyes + muzzle('#e3dfc9')),
  bear: svg(e(14, 15, 10, 10, '#88634a') + e(50, 15, 10, 10, '#88634a') + e(14, 15, 5, 5, '#c4a181') + e(50, 15, 5, 5, '#c4a181') + face('#966e50') + eyes + muzzle('#c4a181')),
  crocodile: svg(p('M8 29L4 17L18 22L27 14L33 23L45 20L54 31L60 43Q58 53 37 53L15 45Z', '#7b9268') + e(22, 30, 12, 12, '#8fa277') + e(41, 41, 20, 10, '#a5b38a') + e(23, 27, 3, 3, '#35483b') + l('M25 45L58 45', '#54694d') + p('M35 45L38 50L41 45M48 45L51 50L54 45', '#f6ead0')),
  dog: DOG_EMOJI_SVG['dog-companion'],
  cat: COLA_ICON,
  bird: svg(p('M18 39L3 31L10 47L25 46', '#899b9a') + e(32, 39, 19, 14, '#c7d3c8') + e(44, 24, 12, 12, '#dfe4d5') + p('M54 23L63 28L54 31', '#cba363') + p('M35 34Q16 29 18 46Q31 49 40 38', '#819697') + e(47, 22, 2.5, 2.5, '#38463e') + l('M29 51V57M40 51V57', '#b59464', 3)),
  crab: svg(l('M20 38L8 33L3 38M19 44L7 44L3 51M44 38L56 33L61 38M45 44L57 44L61 51M20 30L12 23M44 30L52 23', '#b96b50', 3) + p('M15 23Q1 27 3 10L9 17L15 8Q22 17 15 23M49 23Q63 27 61 10L55 17L49 8Q42 17 49 23', '#d78359') + e(32, 38, 19, 14, '#d99468') + l('M25 28L23 20M39 28L41 20', '#b96b50', 3) + e(23, 20, 3, 3, '#38463e') + e(41, 20, 3, 3, '#38463e')),
  seaPredator: svg(p('M7 35Q22 22 43 30L58 18L55 35L61 49L43 40Q25 49 7 39Z', '#7b9494') + p('M24 29L33 9L39 30M25 42L35 54L39 41', '#5f7c80') + p('M7 39Q19 42 29 40L25 46Q14 45 7 39', '#dbe1d0') + e(16, 33, 2, 2, '#35434a') + l('M5 54Q16 50 27 54T50 54', '#a4c2ba', 2)),
};

export function CreatureIcon({ id, size = 36 }: { id: CreatureId; size?: number }) {
  return <span className={styles.creatureIcon} aria-hidden="true" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: ICONS[id] }} />;
}
