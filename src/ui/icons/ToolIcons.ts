import type { ResourceKind } from '@/game/systems/Inventory';
import { claySvg, path as p, line as l, ellipse as e, rect as r, group as g } from './SvgPaths';

const handle = (x: number, top: number, bottom: number) =>
  p(`M${x-3} ${top}L${x+3} ${top}L${x+2} ${bottom}Q${x} ${bottom+3} ${x-3} ${bottom}Z`, '#b89364', '#8b704e', 1.5) +
  l(`M${x-1} ${top+4}L${x-1} ${bottom-4}`, '#e4c696', 1.8);
const binding = (x: number, y: number) => r(x-5, y, 10, 8, 2, '#bdac84') +
  l(`M${x-4} ${y+2}l8 2m-8 0l8 2`, '#efdcaf', 1.6);

/** 木制工具保留真实装配关系：柄、套口、绑绳、刃口分别绘制。 */
export const TOOL_SVG = {
  axe: claySvg(g('rotate(18 32 32)', handle(31, 13, 54) +
    p('M28 18L40 14Q44 22 54 24Q48 36 39 37L29 28Z', '#9baea7', '#617a7b') +
    p('M41 17Q45 23 54 24Q49 33 40 35L39 31Q46 28 47 25Z', '#d1d8c6') +
    p('M29 19L38 17L38 30L29 28Z', '#b7c3b4') + binding(30, 22))),
  pickaxe: claySvg(g('rotate(15 32 32)', handle(31, 15, 54) +
    p('M8 28Q16 10 31 13Q45 11 57 28Q40 20 31 22Q19 20 8 28Z', '#a5b4ab', '#687e7b') +
    p('M12 24Q25 13 39 17Q47 20 52 24Q35 15 12 24Z', '#d9ddc7') + binding(31, 18))),
  shovel: claySvg(g('rotate(22 32 32)',
    p('M26 9H38L37 20H27Z', '#c9ad7e', '#8b704e') + p('M29 12H35V17H29Z', '#f3edda') +
    handle(32, 20, 39) + p('M22 34L42 34L44 43Q41 52 32 57Q21 51 20 43Z', '#a4b7ad', '#68837e') +
    p('M23 38L31 38L31 52Q24 47 23 42Z', '#d2dbca') + l('M32 35L32 48', '#839d96', 2) + binding(32, 30))),
  hoe: claySvg(g('rotate(-12 32 32)', handle(28, 12, 55) +
    p('M26 15L44 15L45 28L38 31L36 21L26 21Z', '#8caaa3', '#5f7e78') +
    p('M37 20L45 19L47 34L38 36Z', '#bdcfc0', '#5f7e78', 1.5) +
    l('M39 33L46 31', '#eef0d9', 2) + binding(28, 17))),
  fishingrod: claySvg(
    p('M13 55Q20 27 40 11Q43 10 43 13Q23 32 19 56Z', '#a9865d', '#7b694c', 1.5) +
    l('M18 48Q25 27 41 13', '#e2c391', 1.8) + l('M41 13Q56 23 49 42', '#80978b', 1.4) +
    p('M49 39V44Q49 50 44 47Q42 45 45 43', 'none', '#688787', 1.8) +
    e(47, 34, 3.6, 6, '#cc8b72') + p('M43 34H51Q50 40 47 40Q44 40 43 34Z', '#e9d4a9') +
    g('rotate(24 20 45)', binding(20, 41)) + e(27, 42, 4, 4, '#a9bcb1') + e(27, 42, 1.5, 1.5, '#69847d')),
  bow: claySvg(
    p('M19 9Q52 29 20 55L17 52Q43 31 17 12Z', '#b69163', '#806d4f') +
    l('M21 14Q45 31 22 50', '#e0c291', 2) + l('M18 10L25 32L18 54', '#b1b8a0', 1.4) +
    l('M9 33L51 29', '#92754e', 2.5) + p('M49 24L58 29L49 34Z', '#a7bdb5', '#687f7e', 1.2) +
    p('M13 32L6 27L7 34L13 37L19 32Z', '#c4cfb4') + binding(35, 29)),
  sword: claySvg(g('rotate(27 32 32)',
    p('M32 6L40 17L36 40H28L24 17Z', '#bccdc3', '#708b88') +
    p('M32 9L32 39H28L27 18Z', '#e5e8d0') + p('M32 10L38 18L34 38H32Z', '#92aca7') +
    r(27, 40, 10, 13, 3, '#a48662') + l('M28 44L36 46M28 48L35 50', '#d9bd89', 1.5) +
    p('M20 37Q32 41 44 37L43 43Q32 46 21 43Z', '#d3b97f', '#9c8559', 1.5) + e(32, 55, 5, 3, '#d3b97f'))),
} satisfies Partial<Record<ResourceKind, string>>;
