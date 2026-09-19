/**
 * Typed accessors over the i18n content for Awake mode. Keeps the view code free
 * of casts and makes the shape of translated lists explicit, so adding locales
 * later is just a matter of dropping in a JSON file with the same structure.
 */

import { t, tRaw } from "../../core/i18n";
import { icons, type IconName } from "../../ui/icons";

export interface IconItem {
  icon: IconName;
  title: string;
  description: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface StepItem {
  title: string;
  description: string;
}

function iconFor(name: string): IconName {
  return name in icons ? (name as IconName) : "clock";
}

export function benefits(): IconItem[] {
  return tRaw<IconItem[]>("awake.why.items").map((item) => ({
    ...item,
    icon: iconFor(item.icon),
  }));
}

export function useCases(): IconItem[] {
  return tRaw<IconItem[]>("awake.useCases.items").map((item) => ({
    ...item,
    icon: iconFor(item.icon),
  }));
}

export function steps(): StepItem[] {
  return tRaw<StepItem[]>("awake.how.steps");
}

export function faqs(): FaqItem[] {
  return tRaw<FaqItem[]>("awake.faq.items");
}

export interface MoreWaysCard {
  key: "digital" | "flip" | "extension";
  title: string;
  description: string;
  cta: string;
  href: string;
  badge?: string;
  art: string;
}

/** Inline SVG placeholder art for a card, styled like each real mode. No
 * gradients and no external image requests. */
function cardArt(kind: "digital" | "flip" | "extension"): string {
  const bg = "#12151b";
  // The clock surface behind the digits. Shared by all three previews so the
  // flip and extension cards sit on the same background as the digital clock.
  const screen = "#070a08";
  if (kind === "digital") {
    // A single wide LED-screen tile (bezel + glow digits), matching the
    // tile/badge language the flip and extension previews use.
    return `<svg viewBox="0 0 200 120" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="200" height="120" fill="${bg}"/>
      <rect x="28" y="30" width="144" height="60" rx="10" fill="${screen}" stroke="rgba(255,255,255,0.08)"/>
      <text x="100" y="72" text-anchor="middle" font-family="monospace" font-size="34" font-weight="700" fill="#f0f0f0">09:41</text>
    </svg>`;
  }
  if (kind === "flip") {
    // Four flip-card tiles with a split line, matching the real flip clock.
    // Draw the digit, then the center split line on top, so the seam reads
    // clearly across the tile (the giveaway that it's a flip clock).
    const tile = (x: number, digit: string): string =>
      `<g><rect x="${x}" y="30" width="34" height="60" rx="8" fill="${screen}" stroke="rgba(255,255,255,0.08)"/><text x="${x + 17}" y="72" text-anchor="middle" font-family="monospace" font-size="32" font-weight="700" fill="#f0f0f0">${digit}</text><line x1="${x}" y1="60" x2="${x + 34}" y2="60" stroke="${bg}" stroke-width="2.5"/></g>`;
    return `<svg viewBox="0 0 200 120" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="200" height="120" fill="${bg}"/>
      ${tile(16, "1")}${tile(54, "2")}
      <circle cx="100" cy="52" r="3" fill="#5a6270"/><circle cx="100" cy="68" r="3" fill="#5a6270"/>
      ${tile(112, "0")}${tile(150, "0")}
    </svg>`;
  }
  // Browser extension: a neutral badge tile with a simple clock glyph.
  return `<svg viewBox="0 0 200 120" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
    <rect width="200" height="120" fill="${bg}"/>
    <rect x="70" y="30" width="60" height="60" rx="10" fill="${screen}" stroke="rgba(255,255,255,0.08)"/>
    <circle cx="100" cy="60" r="14" fill="none" stroke="#dfe2e8" stroke-width="3"/>
    <path d="M100 54v6l4 3" stroke="#dfe2e8" stroke-width="3" fill="none" stroke-linecap="round"/>
  </svg>`;
}

export function moreWaysCards(): MoreWaysCard[] {
  return [
    {
      key: "digital",
      title: t("awake.moreWays.digital.title"),
      description: t("awake.moreWays.digital.description"),
      cta: t("awake.moreWays.digital.cta"),
      href: "/clock",
      art: cardArt("digital"),
    },
    {
      key: "flip",
      title: t("awake.moreWays.flip.title"),
      description: t("awake.moreWays.flip.description"),
      cta: t("awake.moreWays.flip.cta"),
      href: "/flip",
      art: cardArt("flip"),
    },
    {
      key: "extension",
      title: t("awake.moreWays.extension.title"),
      description: t("awake.moreWays.extension.description"),
      cta: t("awake.moreWays.extension.cta"),
      href: "#",
      badge: t("awake.moreWays.extension.badge"),
      art: cardArt("extension"),
    },
  ];
}
