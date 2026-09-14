export function IslandTree({ transform }: { transform: string }) {
  return (
    <g transform={transform}>
      <path d="M-5 0L-3-52 6-52 6 0Z" fill="#937655" />
      <path d="M-34-36-24-65 0-85 29-65 35-37 7-25Z" fill="#6d995b" />
      <path d="M0-85 29-65 35-37 7-25-3-54Z" fill="#4e7e4e" />
      <path d="M-34-36-24-65 0-85-3-54Z" fill="#91b773" />
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
