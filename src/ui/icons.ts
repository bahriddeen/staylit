/**
 * Inline SVG icons as strings. They use `currentColor` so they inherit text
 * color, and are marked aria-hidden (icons are decorative; labels live on the
 * controls). Set the size with `width`/`height` via CSS on the parent.
 */

type IconName =
  | "sun"
  | "moon"
  | "gear"
  | "fullscreen"
  | "exitFullscreen"
  | "close"
  | "warning"
  | "bolt"
  | "lock"
  | "clock"
  | "battery"
  | "devices"
  | "download"
  | "code"
  | "present"
  | "bell"
  | "arrowRight"
  | "display"
  | "layers"
  | "eye"
  | "play"
  | "pause"
  | "reset"
  | "hourglass"
  | "repeat"
  | "flag"
  | "live"
  | "mail"
  | "heart"
  | "share";

const svg = (paths: string): string =>
  `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

const svgFilled = (paths: string): string =>
  `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false">${paths}</svg>`;

export const icons: Record<IconName, string> = {
  sun: svg(
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  ),
  moon: svg('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'),
  gear: svg(
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  ),
  fullscreen: svg(
    '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
  ),
  exitFullscreen: svg(
    '<path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M16 21v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>',
  ),
  close: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  warning: svg(
    '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  ),
  bolt: svg('<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'),
  lock: svg(
    '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  ),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  battery: svg(
    '<rect x="2" y="7" width="16" height="10" rx="2"/><path d="M22 11v2"/><path d="M6 11v2"/>',
  ),
  devices: svg(
    '<rect x="2" y="4" width="14" height="10" rx="2"/><path d="M2 18h10"/><rect x="16" y="9" width="6" height="11" rx="1"/>',
  ),
  download: svg(
    '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  ),
  code: svg('<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>'),
  present: svg(
    '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
  ),
  bell: svg(
    '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  ),
  arrowRight: svg('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'),
  display: svg(
    '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 9v6"/><path d="M12 9v6"/><path d="M17 9v6"/>',
  ),
  layers: svg(
    '<rect x="4" y="3" width="16" height="7" rx="2"/><rect x="4" y="14" width="16" height="7" rx="2"/>',
  ),
  eye: svg(
    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  ),
  play: svgFilled('<path d="M7 4v16l14-8z"/>'),
  pause: svgFilled(
    '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  ),
  reset: svg('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>'),
  hourglass: svg(
    '<path d="M5 2h14"/><path d="M5 22h14"/><path d="M6 2c0 6 6 6 6 10s-6 4-6 10"/><path d="M18 2c0 6-6 6-6 10s6 4 6 10"/>',
  ),
  repeat: svg(
    '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  ),
  flag: svgFilled('<path d="M6 2v20h2v-8h11l-2.5-4L19 6H8V2z"/>'),
  // Broadcast/"on air" mark: a lit center dot with signal arcs radiating out
  // on both sides — reads as "live" rather than a theme or brightness control.
  live: svg(
    '<circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none"/><path d="M8.3 8.3a5.2 5.2 0 0 0 0 7.4"/><path d="M15.7 8.3a5.2 5.2 0 0 1 0 7.4"/><path d="M5.2 5.2a9.6 9.6 0 0 0 0 13.6"/><path d="M18.8 5.2a9.6 9.6 0 0 1 0 13.6"/>',
  ),
  mail: svg(
    '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 8.5 6.5a2.5 2.5 0 0 0 3 0L22 6"/>',
  ),
  heart: svgFilled(
    '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>',
  ),
  // Two nodes linked to a third — a generic "share" glyph.
  share: svg(
    '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  ),
};

export type { IconName };
