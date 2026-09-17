import { claySvg, ellipse, line, path } from './SvgPaths';

/** 通用享用美食表情，不带特定动物的外形特征。 */
export const EATING_ICON_SVG = claySvg(
  ellipse(32, 31, 25, 25, '#e5c482') +
  path('M12 38Q32 57 52 38Q47 57 32 56Q17 56 12 38', '#d3ae72') +
  line('M18 26Q22 20 27 26M37 26Q42 20 46 26', '#685447', 3) +
  ellipse(17, 35, 5, 3, '#dca08b') +
  ellipse(47, 35, 5, 3, '#dca08b') +
  line('M22 37Q32 47 43 36', '#685447', 3) +
  path('M34 41L43 38Q48 48 41 50Q35 51 34 41Z', '#cf8e8a') +
  line('M40 42L41 46', '#ac6e70', 2)
);
