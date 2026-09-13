/** 64×64 黏土图标的基础笔触，仅在模块初始化时拼装静态 SVG。 */
export const path = (d: string, fill: string, stroke = 'none', width = 2) =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
export const line = (d: string, color: string, width = 2) => path(d, 'none', color, width);
export const ellipse = (x: number, y: number, rx: number, ry: number, fill: string) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
export const rect = (x: number, y: number, w: number, h: number, radius: number, fill: string) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}"/>`;
export const group = (transform: string, body: string) => `<g transform="${transform}">${body}</g>`;
export const claySvg = (body: string) =>
  `<svg width="100%" height="100%" viewBox="0 0 64 64" aria-hidden="true">${ellipse(32, 57, 21, 3, '#57452d16')}${body}</svg>`;
