/**
 * Clock templates. Each template is a set of CSS custom properties applied to
 * the stage/cards, plus metadata. The digital and flip views have separate
 * lists. Templates are data-driven so the settings drawer can render live
 * previews from the same source of truth.
 */

import type { ClockView } from "./settings";

export interface DigitalTemplate {
  id: string;
  name: string;
  /** Uses the seven-segment (DSEG7) font. */
  seg: boolean;
  vars: {
    "--clock-bg": string;
    "--clock-fg": string;
    "--clock-glow": string;
    "--clock-font": string;
    "--clock-weight": string;
  };
}

export interface FlipTemplate {
  id: string;
  name: string;
  shadow?: boolean;
  vars: {
    "--page-bg": string;
    "--card-bg": string;
    "--card-fg": string;
    "--split": string;
  };
}

const SEG_FONT = '"DSEG7 Classic", monospace';
const INTER = "var(--font-ui)";

function digital(
  id: string,
  name: string,
  bg: string,
  fg: string,
  glow: string,
  font: string,
  weight: string,
  seg: boolean,
): DigitalTemplate {
  return {
    id,
    name,
    seg,
    vars: {
      "--clock-bg": bg,
      "--clock-fg": fg,
      "--clock-glow": glow,
      "--clock-font": font,
      "--clock-weight": weight,
    },
  };
}

export const DIGITAL_TEMPLATES: DigitalTemplate[] = [
  digital(
    "digital",
    "Digital",
    "#000000",
    "#39ff14",
    "0 0 18px rgba(57,255,20,.55)",
    SEG_FONT,
    "700",
    true,
  ),
  digital(
    "digital-blue",
    "Digital Blue",
    "#00060f",
    "#33b5ff",
    "0 0 18px rgba(51,181,255,.55)",
    SEG_FONT,
    "700",
    true,
  ),
  digital(
    "digital-red",
    "Digital Red",
    "#0a0000",
    "#ff2a2a",
    "0 0 18px rgba(255,42,42,.55)",
    SEG_FONT,
    "700",
    true,
  ),
  digital(
    "digital-amber",
    "Digital Amber",
    "#0a0600",
    "#ffb000",
    "0 0 18px rgba(255,176,0,.5)",
    SEG_FONT,
    "700",
    true,
  ),
  digital(
    "digital-orange",
    "Digital Orange",
    "#0a0400",
    "#ff6a00",
    "0 0 18px rgba(255,106,0,.5)",
    SEG_FONT,
    "700",
    true,
  ),
  digital(
    "pure-dark",
    "Pure Dark",
    "#000000",
    "#ffffff",
    "none",
    INTER,
    "200",
    false,
  ),
  digital("dark", "Dark", "#121417", "#e6e6e6", "none", INTER, "300", false),
  digital("light", "Light", "#f5f5f2", "#111111", "none", INTER, "300", false),
  digital(
    "classic",
    "Classic",
    "#1b1b1b",
    "#f2e6c9",
    "0 2px 3px rgba(0,0,0,.55)",
    '"Space Mono", monospace',
    "400",
    false,
  ),
  digital(
    "digital-cyan",
    "Digital Cyan",
    "#000a0a",
    "#00eaff",
    "0 0 18px rgba(0,234,255,.55)",
    SEG_FONT,
    "700",
    true,
  ),
  digital(
    "digital-purple",
    "Digital Purple",
    "#050014",
    "#b26bff",
    "0 0 18px rgba(178,107,255,.55)",
    SEG_FONT,
    "700",
    true,
  ),
  digital(
    "digital-pink",
    "Digital Pink",
    "#14000a",
    "#ff4fa3",
    "0 0 18px rgba(255,79,163,.55)",
    SEG_FONT,
    "700",
    true,
  ),
  digital(
    "digital-white",
    "Digital White",
    "#050505",
    "#f2f2f2",
    "0 0 14px rgba(255,255,255,.4)",
    SEG_FONT,
    "700",
    true,
  ),
  digital(
    "midnight",
    "Midnight",
    "#0b1020",
    "#dbe4ff",
    "none",
    INTER,
    "300",
    false,
  ),
];

function flip(
  id: string,
  name: string,
  pageBg: string,
  cardBg: string,
  fg: string,
  split: string,
  shadow = false,
): FlipTemplate {
  return {
    id,
    name,
    shadow,
    vars: {
      "--page-bg": pageBg,
      "--card-bg": cardBg,
      "--card-fg": fg,
      "--split": split,
    },
  };
}

const DARK_SPLIT = "rgba(0,0,0,.45)";

export const FLIP_TEMPLATES: FlipTemplate[] = [
  flip("pure-dark", "Pure Dark", "#000000", "#0d0d0d", "#f0f0f0", DARK_SPLIT),
  flip("dark", "Dark", "#151515", "#232323", "#e8e8e8", DARK_SPLIT),
  flip(
    "light",
    "Light",
    "#eeeeee",
    "#ffffff",
    "#1a1a1a",
    "rgba(0,0,0,.12)",
    true,
  ),
  flip("green", "Green", "#04140a", "#0f3d22", "#bdf5cf", DARK_SPLIT),
  flip("blue", "Blue", "#030b18", "#0f2a52", "#cfe3ff", DARK_SPLIT),
  flip("red", "Red", "#160404", "#4d1111", "#ffd6d6", DARK_SPLIT),
  flip("orange", "Orange", "#170902", "#5a260a", "#ffe0c7", DARK_SPLIT),
  flip("yellow", "Yellow", "#161203", "#5a4a0a", "#fff3bf", DARK_SPLIT),
  flip("purple", "Purple", "#0d0616", "#34195a", "#ead9ff", DARK_SPLIT),
  flip("pink", "Pink", "#17060f", "#5a1840", "#ffd6ec", DARK_SPLIT),
  flip("teal", "Teal", "#03120f", "#0f3d38", "#bdf5ec", DARK_SPLIT),
  flip("indigo", "Indigo", "#06071a", "#22245c", "#dcdcff", DARK_SPLIT),
  flip("slate", "Slate", "#12141a", "#2b2f3a", "#e5e7ee", DARK_SPLIT),
  flip("coffee", "Coffee", "#150e08", "#4a2f1a", "#ffe3c2", DARK_SPLIT),
  flip("olive", "Olive", "#0f1206", "#3a4014", "#eef5c9", DARK_SPLIT),
  flip("charcoal", "Charcoal", "#0a0a0a", "#1c1c1c", "#cfcfcf", DARK_SPLIT),
];

export function digitalTemplate(id: string): DigitalTemplate {
  return DIGITAL_TEMPLATES.find((t) => t.id === id) ?? DIGITAL_TEMPLATES[0]!;
}

export function flipTemplate(id: string): FlipTemplate {
  return FLIP_TEMPLATES.find((t) => t.id === id) ?? FLIP_TEMPLATES[1]!;
}

/** Whether a template id is valid for a view (used to sanitize stored values). */
export function isValidTemplate(view: ClockView, id: string): boolean {
  const list = view === "digital" ? DIGITAL_TEMPLATES : FLIP_TEMPLATES;
  return list.some((t) => t.id === id);
}
