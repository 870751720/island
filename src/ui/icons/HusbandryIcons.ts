import { claySvg as svg, path as p, line as l, ellipse, rect as r } from './SvgPaths';

const e = (x: number, y: number, rx: number, ry: number, fill: string, stroke = 'none') => ellipse(x, y, rx, ry, fill).replace('/>', ` stroke="${stroke}" stroke-width="2"/>`);
const dark = '#77685b', cream = '#f3e8d5', metal = '#acb9bb';
export const HUSBANDRY_SVG = {
  cowMilk: svg(p('M25 11H39V23Q46 26 46 33V49Q46 55 40 55H24Q18 55 18 49V33Q18 26 25 23Z', cream, dark)
    + r(24, 8, 16, 8, 3, '#b3c5cf') + p('M20 36Q28 27 32 36Q36 46 26 44L20 46Z', '#6b665e')
    + e(40, 48, 4, 4, '#6b665e') + l('M24 27V31', '#fff9eb', 3)),
  wool: svg(e(32, 55, 22, 3, '#58462a15') + e(23, 33, 15, 17, cream, dark)
    + e(39, 30, 15, 16, cream, dark) + e(33, 42, 17, 13, cream, dark)
    + l('M19 26Q25 20 28 27M34 25Q41 19 45 28M25 40Q32 34 40 41', '#d1c1a9', 3)),
  shears: svg(p('M20 14L39 39L34 43L16 18Z', metal, dark) + p('M44 14L25 39L30 43L48 18Z', metal, dark)
    + e(21, 46, 8, 9, '#af885f', dark) + e(43, 46, 8, 9, '#af885f', dark)
    + e(21, 46, 4, 5, cream) + e(43, 46, 4, 5, cream) + e(32, 32, 3, 3, cream, dark)),
  feedBarrel: svg(p('M13 20L18 50Q32 58 46 50L51 20Z', '#ae8556', dark)
    + e(32, 20, 19, 7, '#695c45', dark) + e(32, 22, 14, 4, '#afbf7a')
    + l('M15 30Q32 38 49 30M18 45Q32 52 46 45', metal, 4)
    + l('M23 28L25 48M41 28L39 48', '#81613e', 2)),
};
