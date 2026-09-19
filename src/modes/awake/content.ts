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
  // The clock surface behind the digits. Shared by the extension preview so it
  // sits on the same background language as the clock previews.
  const screen = "#070a08";
  if (kind === "digital") {
    // The real default digital clock: green seven-segment LED on black, with a
    // faint "88:88" ghost behind the live digits and a soft glow — matching
    // DIGITAL_TEMPLATES[0] and the .digital__ghost pattern in digitalView.ts.
    // Uses the self-hosted DSEG7 font (@font-face lives in awake.css).
    const seg = "'DSEG7 Classic', monospace";
    return `<svg viewBox="0 0 200 120" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs><filter id="awake-led-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <rect width="200" height="120" fill="${bg}"/>
      <rect x="28" y="30" width="144" height="60" rx="10" fill="#000000" stroke="rgba(255,255,255,0.08)"/>
      <text x="100" y="73" text-anchor="middle" font-family="${seg}" font-size="30" font-weight="700" fill="rgba(57,255,20,0.10)">88:88</text>
      <text x="100" y="73" text-anchor="middle" font-family="${seg}" font-size="30" font-weight="700" fill="#39ff14" filter="url(#awake-led-glow)">09:41</text>
    </svg>`;
  }
  if (kind === "flip") {
    // Match the real dark flip clock (FLIP_TEMPLATES "dark"): each digit is a
    // card physically split into a top and bottom half. Rather than painting a
    // line over the digit, we draw two separate rounded halves (top corners /
    // bottom corners) with a 2px page-background gap as the seam, then clip the
    // digit into each half — so the seam actually splits the number, exactly
    // like .flip-card__upper / .flip-card__lower in clock.css.
    const pageBg = "#151515";
    const cardBg = "#232323";
    const edge = "rgba(255,255,255,0.05)";
    const w = 34; // card width
    const r = 8; // corner radius
    const top = 30; // card top edge
    const bottom = 90; // card bottom edge
    const seam = 60; // center of the card / seam
    const half = 29; // half height (top: 30->59, bottom: 61->90, 2px seam)
    const digitStyle =
      "font-family: var(--font-ui); font-feature-settings: 'tnum' 1";
    // Rounded-top-only and rounded-bottom-only card halves.
    const topHalf = (x: number): string =>
      `M ${x} ${top + half} V ${top + r} A ${r} ${r} 0 0 1 ${x + r} ${top} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w} ${top + r} V ${top + half} Z`;
    const botHalf = (x: number): string =>
      `M ${x} ${bottom - half} H ${x + w} V ${bottom - r} A ${r} ${r} 0 0 1 ${x + w - r} ${bottom} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${bottom - r} Z`;
    const digit = (x: number, d: string): string =>
      `<text x="${x + w / 2}" y="${seam}" text-anchor="middle" dominant-baseline="central" style="${digitStyle}" font-size="32" font-weight="700" fill="#e8e8e8">${d}</text>`;
    const tile = (x: number, d: string): string =>
      `<g>` +
      `<path d="${topHalf(x)}" fill="${cardBg}" stroke="${edge}"/>` +
      `<path d="${botHalf(x)}" fill="${cardBg}" stroke="${edge}"/>` +
      `<g clip-path="url(#awake-flip-top)">${digit(x, d)}</g>` +
      `<g clip-path="url(#awake-flip-bottom)">${digit(x, d)}</g>` +
      `</g>`;
    return `<svg viewBox="0 0 200 120" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <clipPath id="awake-flip-top"><rect x="0" y="0" width="200" height="${seam - 1}"/></clipPath>
        <clipPath id="awake-flip-bottom"><rect x="0" y="${seam + 1}" width="200" height="${120 - seam - 1}"/></clipPath>
      </defs>
      <rect width="200" height="120" fill="${pageBg}"/>
      ${tile(16, "0")}${tile(54, "9")}
      <circle cx="100" cy="52" r="3" fill="#6b7280"/><circle cx="100" cy="68" r="3" fill="#6b7280"/>
      ${tile(112, "4")}${tile(150, "1")}
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
