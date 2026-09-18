import type { ResourceKind } from '@/game/systems/Inventory';

const wrap = (body: string) => `<svg width="100%" height="100%" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="56" rx="24" ry="4" fill="#49392718"/>${body}</svg>`;
const pie = (fill: string, topping: string) => wrap(`<path d="M8 30Q8 17 32 17T56 30L53 43Q32 57 11 43Z" fill="#ba803f"/><ellipse cx="32" cy="30" rx="24" ry="14" fill="#e7bd74"/><ellipse cx="32" cy="29" rx="19" ry="10" fill="${fill}"/><path d="M17 23L43 36M26 20L50 31M14 30L33 40M21 37L42 22M13 31L29 20M34 39L51 28" stroke="${topping}" stroke-width="4" stroke-linecap="round"/><path d="M10 42Q32 55 54 42" stroke="#97643e" stroke-width="2" fill="none"/>`);
export const RESEARCH_SVG: Partial<Record<ResourceKind, string>> = {
  researchTable: wrap('<path d="M12 33H20V55H12ZM45 33H53V55H45Z" fill="#987047"/><path d="M5 28L46 21L60 31L19 40L5 35Z" fill="#ba905c"/><path d="M5 28L19 34L60 26V33L19 41L5 35Z" fill="#987047"/><path d="M10 18Q23 11 34 18L31 28Q22 35 13 27Z" fill="#aaa294"/><ellipse cx="22" cy="18" rx="12" ry="5" fill="#e9d5a9"/><path d="M23 18L32 7" stroke="#785538" stroke-width="4" stroke-linecap="round"/><path d="M35 20L47 17L56 23L43 27Z" fill="#fff0cf"/><path d="M41 21L47 20M44 24L50 23" stroke="#9c8057" stroke-width="1.5"/>'),
  strawberryCake: wrap('<path d="M12 24L41 13L54 28V49L12 48Z" fill="#e8c685"/><path d="M12 35L54 35V41L12 41Z" fill="#d57c91"/><path d="M12 23L41 12L54 26V32L12 32Z" fill="#fff0d9"/><path d="M12 23L41 12L54 26L24 30Z" fill="#fff7e7"/><path d="M29 16Q31 8 39 12Q46 17 37 24Q31 23 29 16Z" fill="#d94c60"/><path d="M33 12L32 7L37 10L41 7L40 13Z" fill="#77935b"/><path d="M33 16L34 17M39 15L40 16M37 20L38 21" stroke="#ffe1a1" stroke-width="1.5"/>'),
  applePie: pie('#c88d48', '#f3d79b'),
  meatPie: pie('#965a3b', '#dfb877'),
};
