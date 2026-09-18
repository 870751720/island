import type { ResourceKind } from '@/game/systems/Inventory';
import { HIDDEN_FOOD_SVG } from './HiddenFoodIcons';

const wrap = (body: string) => `<svg width="100%" height="100%" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="56" rx="24" ry="4" fill="#49392718"/>${body}</svg>`;
export const RESEARCH_SVG: Partial<Record<ResourceKind, string>> = {
  ...HIDDEN_FOOD_SVG,
  researchTable: wrap('<path d="M12 33H20V55H12ZM45 33H53V55H45Z" fill="#987047"/><path d="M5 28L46 21L60 31L19 40L5 35Z" fill="#ba905c"/><path d="M5 28L19 34L60 26V33L19 41L5 35Z" fill="#987047"/><path d="M10 18Q23 11 34 18L31 28Q22 35 13 27Z" fill="#aaa294"/><ellipse cx="22" cy="18" rx="12" ry="5" fill="#e9d5a9"/><path d="M23 18L32 7" stroke="#785538" stroke-width="4" stroke-linecap="round"/><path d="M35 20L47 17L56 23L43 27Z" fill="#fff0cf"/><path d="M41 21L47 20M44 24L50 23" stroke="#9c8057" stroke-width="1.5"/>'),
};
