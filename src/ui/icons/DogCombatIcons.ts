import { path, line, ellipse, group } from './SvgPaths';

/** 薯条：蓬松黑毛、亮眼与粉舌，头像和战斗表情共用同一张脸。 */
function dogFace(biting = false): string {
  const fur = Array.from({ length: 36 }, (_, i) => {
    const angle = -Math.PI / 2 + i * Math.PI / 18;
    const radius = i % 2 === 0 ? 1 : .88;
    return `${(32 + Math.cos(angle) * 27 * radius).toFixed(2)},${(33 + Math.sin(angle) * 25 * radius).toFixed(2)}`;
  }).join(' ');
  const eyes = [22, 42].map(x => ellipse(x, 29, 5, 5, '#49434a')
    + ellipse(x, 29, 4, 4, '#100f15')
    + ellipse(x - 1, 27.7, 1.2, 1.2, '#fff7ed')
    + ellipse(x + 1, 30, .5, .5, '#bda4a5')).join('');
  return path('M12 27L12 5Q22 7 26 19L40 19Q46 6 53 5L52 28Z', '#252630')
    + path('M16 20L16 11L23 20ZM43 20L49 11L49 22Z', '#58424e')
    + `<polygon points="${fur}" fill="#252630"/>`
    + eyes + ellipse(32, 34, 4, 2.5, '#0c0c12')
    + path('M21 37Q32 44 43 37Q40 53 32 53Q24 52 21 37', '#100e16')
    + (biting
      ? path('M23 39L28 41L26 47ZM36 41L41 39L38 47Z', '#fff7ed')
        + path('M28 49Q32 46 36 49L35 52L29 52Z', '#ef98b0')
        + line('M17 23L26 26M38 26L47 23', '#79727d', 2)
      : path('M27 44Q32 42 37 44L36 52Q32 58 28 52Z', '#ef98b0')
        + line('M32 46v6', '#c46a88', 1));
}

const svg = (body: string) => `<svg width="100%" height="100%" viewBox="0 0 64 64" aria-hidden="true">${body}</svg>`;
const tiltedFace = (biting = false) => group('rotate(-13 32 32)', dogFace(biting));

export const DOG_COMBAT_SVG: Readonly<Record<string, string>> = {
  'dog-companion': svg(tiltedFace() + path('M51 8Q54 3 57 7Q62 4 62 9L56 15Z', '#e89bad')),
  'dog-alert': svg(tiltedFace() + line('M58 6v9', '#c99b4b', 3) + ellipse(58, 21, 1.8, 1.8, '#c99b4b')),
  'dog-bite': svg(tiltedFace(true) + line('M6 18L2 14M5 25L1 24M56 24L62 20', '#c99b4b', 2.5)),
  'dog-guard': svg(group('translate(0 -1) scale(.88)', tiltedFace(true))
    + path('M46 33L59 38L57 51Q53 58 46 61Q39 58 35 51L33 38Z', '#819b73', '#f5e5b7', 2)
    + path('M46 53L39 46Q35 41 40 40Q44 39 46 43Q49 38 53 41Q57 45 46 53', '#fff0cf')),
};
