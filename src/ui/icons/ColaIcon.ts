function colaIcon() {
  const face = 'M12 31C12 14 53 14 53 32C58 61 7 61 12 31Z';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M13 30L10 7Q20 6 27 22L39 22Q47 8 55 7L52 33" fill="#686c70"/><path d="M15 23L14 13L23 24M43 23L51 13L50 26" fill="#bb8d90"/><path d="${face}" fill="#eee9dd"/><path d="M12 31Q14 18 30 18L29 26L24 38L12 35ZM34 18Q52 19 53 32L53 37L39 36L34 27Z" fill="#686c70"/><path d="M29 26L33 21L37 37L30 43L25 37Z" fill="#eee9dd"/>${[22,43].map(x => `<ellipse cx="${x}" cy="34" rx="5.5" ry="6" fill="#323b3b"/><circle cx="${x}" cy="34" r="4.8" fill="#c8a449"/><ellipse cx="${x}" cy="34" rx="2.1" ry="4" fill="#16242a"/><circle cx="${x-1.6}" cy="32" r="1.2" fill="#fff9ec"/>`).join('')}<path d="M28 42Q32 39 36 42L32 46Z" fill="#37393c"/><path d="M25 46Q29 43 30 48L24 49ZM34 46Q38 44 39 49L34 49ZM44 42L49 43L47 48L42 48Z" fill="#686c70"/><path d="M32 46V49M28 51Q32 54 36 51" fill="none" stroke="#66605c" stroke-linecap="round" stroke-width="1.2"/><path d="M18 44L5 42M18 48L6 49M46 47L59 45M46 50L58 53" stroke="#b7b0a5" stroke-width="1"/></svg>`;
}

export const COLA_ICON = colaIcon();
