import type { ResourceKind } from '@/game/systems/Inventory';
import { claySvg, path as p, line as l, ellipse as e, rect as r } from './SvgPaths';

type Material = 'grass' | 'fur' | 'iron';
const palettes = {
  grass: { base: '#9eaf76', dark: '#6c855b', light: '#d5dcb0', trim: '#c9b486' },
  fur: { base: '#b58e6c', dark: '#826851', light: '#e5c8a1', trim: '#efdcbc' },
  iron: { base: '#a8c1bc', dark: '#6d9192', light: '#dce5d3', trim: '#e9dcb7' },
};
function shirt(material: Material) {
  const c=palettes[material];
  return claySvg(
    p('M23 13L13 18L5 33L16 39L20 32L19 53Q32 58 45 53L44 32L49 39L59 33L51 18L41 13Z', c.base, c.dark) +
    p('M23 13Q32 19 41 13L39 23Q32 28 25 23Z', c.trim) +
    p('M25 13Q32 18 39 13L37 19Q32 23 27 19Z', c.dark) +
    p('M43 29L45 53L39 54L38 29Z', c.dark) +
    p('M7 30L18 35L16 39L5 33ZM46 35L57 30L59 33L49 39Z', c.trim) +
    l('M24 28L23 43', c.light, 2.5) +
    (material==='grass' ? p('M22 45L29 49L32 44L36 49L43 45L44 53L38 55L32 51L25 55L20 52Z', c.light) :
      material==='fur' ? l('M31 25V51', c.dark, 1.5) + e(34, 30, 1.6, 1.6, c.trim) + e(34, 40, 1.6, 1.6, c.trim) :
        p('M25 27L39 27L38 40L32 45L26 40Z', c.light, c.dark, 1.4) + l('M32 29V40', c.base, 2)));
}
function pants(material: Material) {
  const c=palettes[material];
  return claySvg(
    p('M19 13H45L48 51L35 54L32 33L29 54L16 51Z', c.base, c.dark) +
    p('M19 13H45L45 22H18Z', c.dark) + r(28, 15, 8, 6, 1.5, c.trim) + r(30, 16, 4, 3, 1, c.dark) +
    p('M40 23L43 49L47 49L45 23Z', c.dark) +
    p('M16 46L29 49L29 54L16 51ZM35 49L47 46L48 51L35 54Z', c.trim) +
    l('M23 26L22 39', c.light, 2.4) +
    (material==='grass'? p('M19 28Q32 30 21 42Q17 35 19 28Z', c.light) :
      material==='iron'? r(20, 33, 8, 9, 3, c.light) + r(36, 33, 8, 9, 3, c.light) :
        l('M21 27L26 28M37 28L42 27', c.dark, 1.5)));
}
function hat(material: Material) {
  const c=palettes[material];
  if(material==='grass')return claySvg(
    e(32, 42, 26, 10, c.base) + p('M17 39L21 21Q32 13 43 21L47 39Z', c.base, c.dark) +
    p('M21 22Q32 17 43 22L41 26Q32 23 23 26Z', c.light) +
    p('M18 34Q32 39 46 34L47 40Q32 45 17 40Z', c.trim) +
    l('M11 42Q31 54 53 42', c.light, 2.3) + l('M26 26L24 32M35 25L35 34', c.dark, 1.3));
  if(material==='fur')return claySvg(
    p('M11 37Q10 17 30 15Q50 13 53 37Z', c.base, c.dark) +
    p('M13 34Q30 27 51 34L52 43L13 44Z', c.dark) +
    p('M13 38Q35 34 56 42Q51 51 35 47L14 45Z', c.base, c.dark) +
    l('M19 28Q28 20 39 23', c.light, 3) + l('M32 17L35 30', c.dark, 1.5) +
    l('M18 39L27 39', c.trim, 2) + e(46, 40, 2, 2, c.trim));
  return claySvg(
    p('M14 37Q12 16 31 13Q51 14 51 37L47 44H17Z', c.base, c.dark) +
    p('M29 14L35 14L38 37H28Z', c.light) +
    p('M11 36Q32 41 54 36L53 44Q32 52 11 44Z', c.trim, c.dark, 1.5) +
    l('M17 40Q32 44 47 40', '#fff2d3', 2.3) + e(32, 40, 2.5, 2.5, c.dark));
}
function pack(material: Material) {
  const c=palettes[material];
  return claySvg(
    p('M19 25Q9 24 12 46M45 25Q55 24 52 46', 'none', c.dark, 4) +
    p('M25 18V12Q32 7 39 12V18', 'none', c.dark, 4) +
    p('M17 23Q17 17 24 17H42Q49 18 49 26L48 49Q47 55 33 55Q17 55 16 49Z', c.base, c.dark) +
    p('M17 23Q32 28 49 23L47 34Q33 40 18 34Z', c.light, c.dark, 1.4) +
    r(29, 29, 8, 11, 2, c.trim) + r(31, 32, 4, 4, 1, c.dark) +
    p('M23 42H42L41 50Q33 54 24 49Z', material==='fur'?c.dark:c.light) +
    l('M20 38L20 47', c.light, 2) +
    (material==='grass'?l('M25 43L28 49M32 43L35 50M39 43L41 48M25 47H40', c.dark, 1):
      e(24, 22, 1.6, 1.6, c.trim)+e(42, 22, 1.6, 1.6, c.trim)));
}

/** 三套装备共享裁片结构；草编、皮毛和海沫色金属各有独立纹理与配件。 */
export const EQUIPMENT_SVG = {
  skateboard: claySvg(e(19, 45, 5, 6, '#353d48') + e(46, 35, 5, 6, '#353d48') + p('M8 35L45 19Q57 16 57 24L20 43Q9 47 8 35Z', '#c18d51') + p('M13 33L45 21Q52 19 53 23L20 39Q13 41 13 33Z', '#427d78') + l('M24 29L38 23', '#9dc3a5', 2)),
  grassShirt: shirt('grass'), grassPants: pants('grass'), strawHat: hat('grass'), strawBackpack: pack('grass'),
  furShirt: shirt('fur'), furPants: pants('fur'), furHat: hat('fur'), furBackpack: pack('fur'),
  ironShirt: shirt('iron'), ironPants: pants('iron'), ironHat: hat('iron'), ironBackpack: pack('iron'),
} satisfies Partial<Record<ResourceKind, string>>;
