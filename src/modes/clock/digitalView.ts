/**
 * Digital clock renderer.
 *
 * Layout is a single line: HH : MM : SS with an optional AM/PM label pinned to
 * the top-right and an optional date line below. Seven-segment templates render
 * a faint "88:88:88" ghost behind the live digits for an authentic LCD look.
 * The colon blink is pure CSS (disabled under prefers-reduced-motion). Per-tick
 * work only writes text/attributes — no layout reads.
 */

import type { ClockRenderer } from "./view";
import type { ClockSettings } from "./settings";
import type { TimeParts } from "./time";
import { dateLine } from "./time";
import { digitalTemplate } from "./templates";

export function createDigitalView(): ClockRenderer {
  const root = document.createElement("div");
  root.className = "digital clock-face";

  const time = document.createElement("div");
  time.className = "digital__time";

  const ghost = document.createElement("span");
  ghost.className = "digital__ghost";
  ghost.setAttribute("aria-hidden", "true");
  ghost.textContent = "88:88:88";

  const live = document.createElement("div");
  live.className = "digital__live";

  const hh = span("dg dg--h", "--");
  const c1 = span("dg-colon", ":");
  const mm = span("dg dg--m", "--");
  const c2 = span("dg-colon dg-colon--sec", ":");
  const ss = span("dg dg--s", "--");
  live.append(hh, c1, mm, c2, ss);

  // AM/PM is pinned to the top-right of the digit block, so it lives on .time.
  const ampm = span("digital__ampm", "");
  time.append(ghost, live, ampm);

  const dateEl = document.createElement("div");
  dateEl.className = "digital__date";
  dateEl.hidden = true;

  root.append(time, dateEl);

  function applySettings(settings: ClockSettings): void {
    const tpl = digitalTemplate(settings.template);
    for (const [k, v] of Object.entries(tpl.vars)) {
      root.style.setProperty(k, v);
    }
    root.dataset.template = tpl.id;
    root.dataset.seg = String(tpl.seg);
    root.dataset.seconds = String(settings.seconds);
    root.dataset.format = settings.format;
    ghost.textContent = settings.seconds ? "88:88:88" : "88:88";
    dateEl.hidden = !settings.dayAndYear;
  }

  function render(
    parts: TimeParts,
    _nowMs: number,
    settings: ClockSettings,
  ): void {
    if (hh.textContent !== parts.hh) hh.textContent = parts.hh;
    if (mm.textContent !== parts.mm) mm.textContent = parts.mm;
    if (settings.seconds && ss.textContent !== parts.ss)
      ss.textContent = parts.ss;
    if (ampm.textContent !== parts.ampm) ampm.textContent = parts.ampm;
    if (settings.dayAndYear) {
      const line = dateLine(new Date());
      if (dateEl.textContent !== line) dateEl.textContent = line;
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

function span(className: string, text: string): HTMLSpanElement {
  const el = document.createElement("span");
  el.className = className;
  el.textContent = text;
  return el;
}
