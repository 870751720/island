export function IslandTree({ transform, interactive = false }: { transform: string; interactive?: boolean }) {
  return (
    <g transform={transform} data-egg={interactive ? 'tree' : undefined} role={interactive ? 'button' : undefined} tabIndex={interactive ? 0 : undefined} aria-label={interactive ? '轻摇树冠' : undefined}>
      <path d="M-5 0L-3-52 6-52 6 0Z" fill="#937655" />
      <g className="egg-crown"><path d="M-34-36-24-65 0-85 29-65 35-37 7-25Z" fill="#6d995b" />
      <path d="M0-85 29-65 35-37 7-25-3-54Z" fill="#4e7e4e" />
      <path d="M-34-36-24-65 0-85-3-54Z" fill="#91b773" /></g>
      {interactive && <><g className="egg-leaf" opacity="0" fill="#91b773"><ellipse cx="-18" cy="-45" rx="5" ry="2" /><ellipse cx="12" cy="-35" rx="4" ry="2" /></g>
      <rect className="egg-hit" fill="transparent" x="-34" y="-85" width="69" height="60" /></>}
    </g>
  );
}
export function IslandBerryBush() {
  return (
    <g transform="translate(151 166)">
      <ellipse cy="4" rx="16" ry="5" fill="#365b42" opacity=".19" />
      <path d="M-4 3-6-8M2 4 5-8" stroke="#84714c" strokeWidth="2.4" />
      <path d="M-17-3-15-12-8-16 0-13 8-17 16-10 17-2 9 4-5 5Z" fill="#527c4d" />
      <path d="M-17-3-15-12-8-16 0-13-2-4-10 0Z" fill="#80a45d" />
      <path d="M0-13 8-17 16-10 7-7-2-4Z" fill="#96b56b" />
      <path d="M-2-4 7-7 17-2 9 4-5 5Z" fill="#61894f" />
      <g fill="#b65f6b">
        <circle cx="-10" cy="-7" r="2.6" />
        <circle cx="-5" cy="-3" r="2.6" />
        <circle cx="5" cy="-11" r="2.7" />
        <circle cx="10" cy="-5" r="2.6" />
        <circle cx="3" cy="0" r="2.4" />
      </g>
      <g fill="#e5a6a3">
        <circle cx="-10.6" cy="-7.8" r=".8" />
        <circle cx="4.4" cy="-11.8" r=".8" />
        <circle cx="9.4" cy="-5.8" r=".8" />
      </g>
    </g>
  );
}
