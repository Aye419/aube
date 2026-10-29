/**
 * Generates crisp Red, White & Black Swiss clock SVG cursor data URIs
 * whose hour and minute hands match the user's real local time.
 * Includes an outer white halo + black/red bezel so the cursor stays
 * sharply legible over both pure white and pure black surfaces.
 */
export function buildClockCursorUrls(date: Date): {
  defaultCursor: string;
  pointerCursor: string;
} {
  const minutes = date.getMinutes();
  const hours = (date.getHours() % 12) + minutes / 60;

  const hourAngle = Math.round(hours * 30);
  const minuteAngle = Math.round(minutes * 6);

  // Standard Swiss Clock Cursor (32x32, hotspot at center 16,16)
  const defaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14.5" fill="#FFFFFF" />
    <circle cx="16" cy="16" r="12.8" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="2.2" />
    <rect x="15.2" y="5" width="1.6" height="2.6" rx="0.8" fill="#DC2626" />
    <rect x="24.4" y="15.2" width="2.6" height="1.6" rx="0.8" fill="#0A0A0A" />
    <rect x="15.2" y="24.4" width="1.6" height="2.6" rx="0.8" fill="#0A0A0A" />
    <rect x="5" y="15.2" width="2.6" height="1.6" rx="0.8" fill="#0A0A0A" />
    <g transform="rotate(${hourAngle} 16 16)">
      <line x1="16" y1="16" x2="16" y2="9.8" stroke="#0A0A0A" stroke-width="2.2" stroke-linecap="round" />
    </g>
    <g transform="rotate(${minuteAngle} 16 16)">
      <line x1="16" y1="16" x2="16" y2="7.2" stroke="#0A0A0A" stroke-width="1.6" stroke-linecap="round" />
    </g>
    <g transform="rotate(135 16 16)">
      <line x1="16" y1="18" x2="16" y2="7.8" stroke="#DC2626" stroke-width="1.2" stroke-linecap="round" />
    </g>
    <circle cx="16" cy="16" r="1.8" fill="#DC2626" />
  </svg>`;

  // Interactive Hover Alarm-Clock Cursor (crimson red bezel + twin top alarm bells)
  const pointerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <path d="M5.5 7.5 L9.5 4.2" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" />
    <path d="M26.5 7.5 L22.5 4.2" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" />
    <path d="M5.5 7.5 L9.5 4.2" stroke="#0A0A0A" stroke-width="2.2" stroke-linecap="round" />
    <path d="M26.5 7.5 L22.5 4.2" stroke="#0A0A0A" stroke-width="2.2" stroke-linecap="round" />
    <circle cx="16" cy="17" r="13.8" fill="#FFFFFF" />
    <circle cx="16" cy="17" r="12" fill="#FFFFFF" stroke="#DC2626" stroke-width="2.5" />
    <rect x="15.2" y="6.8" width="1.6" height="2.4" rx="0.8" fill="#DC2626" />
    <rect x="23.8" y="16.2" width="2.4" height="1.6" rx="0.8" fill="#0A0A0A" />
    <rect x="15.2" y="24.8" width="1.6" height="2.4" rx="0.8" fill="#0A0A0A" />
    <rect x="5.8" y="16.2" width="2.4" height="1.6" rx="0.8" fill="#0A0A0A" />
    <g transform="rotate(${hourAngle} 16 17)">
      <line x1="16" y1="17" x2="16" y2="11.2" stroke="#0A0A0A" stroke-width="2.2" stroke-linecap="round" />
    </g>
    <g transform="rotate(${minuteAngle} 16 17)">
      <line x1="16" y1="17" x2="16" y2="8.8" stroke="#DC2626" stroke-width="1.8" stroke-linecap="round" />
    </g>
    <circle cx="16" cy="17" r="2" fill="#DC2626" />
  </svg>`;

  const encode = (svg: string) =>
    `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}") 16 16`;

  return {
    defaultCursor: `${encode(defaultSvg)}, auto`,
    pointerCursor: `${encode(pointerSvg)}, pointer`,
  };
}
