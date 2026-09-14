import { path, line, ellipse, claySvg } from './SvgPaths';

/** 自绘黑色博美战斗表情，64px 母版；不依赖系统 emoji 字形。 */
function dogFace(biting = false): string {
  return path('M10 28L8 7L25 16L39 16L56 7L54 30Z', '#343740')
    + path('M13 20L12 13L21 18M43 18L52 13L51 22', '#c08f86')
    + ellipse(32, 35, 24, 21, '#3e424a')
    + path('M12 32L7 39L14 40L12 47L21 47L25 55L32 51L40 55L45 47L53 47L51 39L57 36L51 31', '#3e424a')
    + ellipse(32, 43, 14, 10, '#717079')
    + ellipse(23, 32, 3, 3.5, '#fff4d9') + ellipse(42, 32, 3, 3.5, '#fff4d9')
    + ellipse(24, 33, 1.5, 2, '#24282e') + ellipse(41, 33, 1.5, 2, '#24282e')
    + path('M28 39Q32 37 36 39L32 43Z', '#24282e')
    + (biting
      ? path('M23 44Q32 40 42 44Q40 56 32 54Q25 53 23 44', '#24282e')
        + path('M25 44L29 45L27 50ZM36 45L40 44L38 50Z', '#fff4d9')
        + line('M18 26L27 29M38 29L47 26', '#24282e', 3)
      : line('M26 46Q32 50 38 46', '#24282e', 2));
}

export const DOG_COMBAT_SVG: Readonly<Record<string, string>> = {
  'dog-companion': claySvg(dogFace()),
  'dog-alert': claySvg(dogFace() + line('M58 17L59 8', '#c99b4b', 3) + ellipse(58, 23, 1.8, 1.8, '#c99b4b')),
  'dog-bite': claySvg(dogFace(true) + line('M6 22L2 19M7 29L2 29M56 28L62 25', '#c99b4b', 2.5)),
  'dog-guard': claySvg(`<g transform="translate(-2 -3) scale(.86)">${dogFace(true)}</g>`
    + path('M44 32L58 37L56 51Q52 58 44 61Q36 57 32 51L30 37Z', '#819b73', '#f5e5b7', 2)
    + path('M44 53L36 44Q34 38 40 39Q43 39 44 42Q48 36 52 41Q54 45 44 53', '#fff0cf')),
};
