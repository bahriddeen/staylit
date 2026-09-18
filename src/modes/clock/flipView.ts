/**
 * Flip clock renderer.
 *
 * Layout: [H][H] : [M][M] : [S][S]. Each digit is a self-contained 4-leaf flip
 * card (classic technique):
 *   .upper       static top half of the NEW digit
 *   .lower       static bottom half of the OLD digit
 *   .flap-top    animated top half of the OLD digit (rotateX 0 → -90, origin bottom)
 *   .flap-bottom animated bottom half of the NEW digit (rotateX 90 → 0, origin top)
 * Flap-top runs 300ms ease-in, then flap-bottom 300ms ease-out (starts at 300ms).
 * Only digits that actually change are animated; reduced motion swaps instantly.
 *
 * Animation uses the Web Animations API (no reflow hacks, no per-tick layout
 * reads). In environments without Element.animate (tests), it swaps instantly.
 */

import type { ClockRenderer } from "./view";
import type { ClockSettings } from "./settings";
import type { TimeParts } from "./time";
import { flipTemplate } from "./templates";

const CAN_ANIMATE =
  typeof Element !== "undefined" &&
  typeof Element.prototype.animate === "function";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

interface FlipCard {
  el: HTMLElement;
  set(digit: string, animate: boolean): void;
}

function createCard(): FlipCard {
  const el = document.createElement("div");
  el.className = "flip-card";

  const upper = leaf("flip-card__upper");
  const lower = leaf("flip-card__lower");
  const flapTop = leaf("flip-card__flap flip-card__flap-top", true);
  const flapBottom = leaf("flip-card__flap flip-card__flap-bottom", true);
  el.append(upper.leafEl, lower.leafEl, flapTop.leafEl, flapBottom.leafEl);

  let current = "";
  let running: Animation[] = [];

  function setAll(d: string): void {
    upper.text(d);
    lower.text(d);
    flapTop.text(d);
    flapBottom.text(d);
  }

  function cancelRunning(): void {
    for (const a of running) a.cancel();
    running = [];
  }

  function set(digit: string, animate: boolean): void {
    if (digit === current) return;
    const old = current;
    if (!animate || !CAN_ANIMATE || old === "") {
      cancelRunning();
      current = digit;
      setAll(digit);
      return;
    }

    cancelRunning();
    // Prepare faces: upper reveals NEW, lower keeps OLD until covered.
    upper.text(digit);
    lower.text(old);
    flapTop.text(old);
    flapBottom.text(digit);
    current = digit;

    const anims: Animation[] = [];
    const top = flapTop.leafEl.animate(
      [{ transform: "rotateX(0deg)" }, { transform: "rotateX(-90deg)" }],
      { duration: 300, easing: "ease-in", fill: "forwards" },
    );
    top.onfinish = () => (flapTop.leafEl.style.opacity = "0");
    anims.push(top);
    if (flapTop.shade) {
      anims.push(
        flapTop.shade.animate([{ opacity: 0 }, { opacity: 0.55 }], {
          duration: 300,
          easing: "ease-in",
          fill: "forwards",
        }),
      );
    }

    const bottom = flapBottom.leafEl.animate(
      [{ transform: "rotateX(90deg)" }, { transform: "rotateX(0deg)" }],
      { duration: 300, delay: 300, easing: "ease-out", fill: "both" },
    );
    anims.push(bottom);
    if (flapBottom.shade) {
      anims.push(
        flapBottom.shade.animate([{ opacity: 0.55 }, { opacity: 0 }], {
          duration: 300,
          delay: 300,
          easing: "ease-out",
          fill: "both",
        }),
      );
    }

    // Track every animation (incl. the shade overlays) so cleanup cancels them
    // all — otherwise a fill:forwards shade stays applied and darkens the leaf.
    running = anims;
    bottom.onfinish = () => {
      // Settle into the resting state showing NEW on every leaf.
      lower.text(digit);
      cancelRunning();
      flapTop.leafEl.style.opacity = "";
      setAll(digit);
    };
  }

  return { el, set };
}

interface Leaf {
  leafEl: HTMLElement;
  text(d: string): void;
  shade: HTMLElement | null;
}

function leaf(className: string, withShade = false): Leaf {
  const leafEl = document.createElement("div");
  leafEl.className = className;
  const span = document.createElement("span");
  leafEl.appendChild(span);
  let shade: HTMLElement | null = null;
  if (withShade) {
    shade = document.createElement("div");
    shade.className = "flip-card__shade";
    shade.setAttribute("aria-hidden", "true");
    leafEl.appendChild(shade);
  }
  return {
    leafEl,
    shade,
    text(d: string) {
      if (span.textContent !== d) span.textContent = d;
    },
  };
}

export function createFlipView(): ClockRenderer {
  const root = document.createElement("div");
  root.className = "flip clock-face";

  const rowl = document.createElement("div");
  rowl.className = "flip__row";

  const cards = {
    h0: createCard(),
    h1: createCard(),
    m0: createCard(),
    m1: createCard(),
    s0: createCard(),
    s1: createCard(),
  };

  const hourGroup = group([cards.h0, cards.h1]);
  const ampm = document.createElement("span");
  ampm.className = "flip__ampm";
  hourGroup.appendChild(ampm);

  const secGroup = group([cards.s0, cards.s1]);
  const secColon = colon();

  rowl.append(
    hourGroup,
    colon(),
    group([cards.m0, cards.m1]),
    secColon,
    secGroup,
  );
  root.append(rowl);

  const ordered = [cards.h0, cards.h1, cards.m0, cards.m1];
  const secCards = [cards.s0, cards.s1];

  // Placeholder before the first tick, so there is no layout shift.
  for (const c of [...ordered, ...secCards]) c.set("-", false);

  function applySettings(settings: ClockSettings): void {
    const tpl = flipTemplate(settings.template);
    for (const [k, v] of Object.entries(tpl.vars)) {
      root.style.setProperty(k, v);
    }
    root.dataset.template = tpl.id;
    root.dataset.shadow = String(Boolean(tpl.shadow));
    root.dataset.seconds = String(settings.seconds);
    root.dataset.format = settings.format;
    secGroup.hidden = !settings.seconds;
    secColon.hidden = !settings.seconds;
    ampm.hidden = settings.format !== "12";
  }

  function render(
    parts: TimeParts,
    _nowMs: number,
    settings: ClockSettings,
  ): void {
    const animate = !prefersReducedMotion();
    const digits = parts.hh + parts.mm;
    ordered.forEach((card, i) => card.set(digits[i]!, animate));
    if (settings.seconds) {
      secCards[0]!.set(parts.ss[0]!, animate);
      secCards[1]!.set(parts.ss[1]!, animate);
    }
    if (settings.format === "12" && ampm.textContent !== parts.ampm) {
      ampm.textContent = parts.ampm;
    }
  }

  return {
    element: root,
    applySettings,
    render,
    destroy() {
      root.remove();
    },
  };
}

function group(cards: FlipCard[]): HTMLElement {
  const g = document.createElement("div");
  g.className = "flip-group";
  for (const c of cards) g.appendChild(c.el);
  return g;
}

function colon(): HTMLElement {
  const c = document.createElement("div");
  c.className = "flip-colon";
  c.setAttribute("aria-hidden", "true");
  c.append(dot(), dot());
  return c;
}

function dot(): HTMLElement {
  const d = document.createElement("span");
  d.className = "flip-colon__dot";
  return d;
}
