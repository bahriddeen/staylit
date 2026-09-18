/**
 * Awake mode — Project A.
 *
 * Composes the hero card and content sections and wires the UI to the app-wide
 * session (shared wake lock + background countdown). The mode owns no wake lock
 * or timer itself, so a timed run keeps going after you switch to a clock; when
 * you return, the toggle and countdown reflect the live session state.
 *
 * mountAwakeMode(root, session) renders into `root` and returns a disposer.
 */

import "./awake.css";

import { createStorage } from "../../core/storage";
import { t } from "../../core/i18n";
import { icons } from "../../ui/icons";
import type { AppSession, SessionState } from "../../app/session";
import type { WakeLockState } from "../../core/wakeLock";
import { createHero, type HeroView } from "./hero";
import { createSections } from "./sections";
import {
  DEFAULT_SELECTION,
  clampCustom,
  formatHMS,
  selectionToMs,
  type DurationPreset,
  type DurationSelection,
} from "./durations";

type StatusKind = "off" | "on" | "paused" | "unsupported";

export interface AwakeMode {
  destroy(): void;
}

export function mountAwakeMode(
  root: HTMLElement,
  session: AppSession,
): AwakeMode {
  const store = createStorage<DurationSelection>(
    "awake.duration",
    DEFAULT_SELECTION,
  );

  const originalTitle = document.title;
  let selection: DurationSelection = { ...DEFAULT_SELECTION, ...store.get() };

  const hero: HeroView = createHero(selection, {
    onPresetChange,
    onToggle,
    onCustomChange,
  });

  const wrapper = document.createElement("div");
  wrapper.className = "awake awake-page";
  wrapper.append(hero.element, createSections());
  root.append(wrapper);

  // ----- Behavior -----
  function persist(): void {
    store.set(selection);
  }

  function isActive(): boolean {
    return session.getState().wake.wanted;
  }

  function onToggle(checked: boolean): void {
    if (checked) session.start(selectionToMs(selection));
    else session.stop();
  }

  function onPresetChange(preset: DurationPreset): void {
    selection = { ...selection, preset };
    hero.customFields.hidden = preset !== "custom";
    persist();
    if (isActive()) session.start(selectionToMs(selection)); // restart while active
  }

  function onCustomChange(hours: number, minutes: number): void {
    selection = { ...selection, ...clampCustom(hours, minutes) };
    persist();
    if (isActive() && selection.preset === "custom") {
      session.start(selectionToMs(selection));
    }
  }

  // ----- Rendering (driven by the session) -----
  function computeStatus(s: WakeLockState): StatusKind {
    if (!s.supported && !s.active) return "unsupported";
    if (s.wanted && s.active) return "on";
    if (s.wanted && !s.active) return "paused";
    return "off";
  }

  function renderTitle(status: StatusKind, st: SessionState): void {
    if (status !== "on") {
      document.title = originalTitle;
      return;
    }
    document.title = st.timed
      ? `⏱ ${formatHMS(st.remainingMs)} · ${t("awake.docTitle.active")}`
      : `● ${t("awake.docTitle.always")}`;
  }

  function render(st: SessionState): void {
    const status = computeStatus(st.wake);
    // Keep the toggle in sync with the shared session (incl. cross-mode / finish).
    hero.toggle.setChecked(st.wake.wanted, true);

    hero.statusEl.textContent = "";
    hero.statusEl.dataset.status = status;

    if (status === "unsupported") {
      hero.statusEl.append(
        banner(
          "warning",
          t("awake.status.unsupportedTitle"),
          t("awake.status.unsupportedBody"),
        ),
      );
    } else if (status === "paused") {
      hero.statusEl.append(
        banner(
          "warning",
          t("awake.status.pausedTitle"),
          t("awake.status.pausedBody"),
        ),
      );
    } else if (status === "on") {
      hero.statusEl.append(activeStatus(st));
    } else {
      const off = document.createElement("p");
      off.className = "hero__status-off";
      off.textContent = t("awake.status.off");
      hero.statusEl.append(off);
    }

    renderTitle(status, st);
  }

  function activeStatus(st: SessionState): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "hero__active";
    const dot = document.createElement("span");
    dot.className = "pulse-dot";
    dot.setAttribute("aria-hidden", "true");
    const value = document.createElement("span");
    value.className = "hero__countdown";
    value.textContent = st.timed
      ? formatHMS(st.remainingMs)
      : t("awake.status.alwaysOn");
    wrap.append(dot, value);
    return wrap;
  }

  function banner(
    icon: keyof typeof icons,
    title: string,
    bodyText: string,
  ): HTMLElement {
    const el = document.createElement("div");
    el.className = "banner banner--warn";
    el.setAttribute("role", "alert");
    const ic = document.createElement("span");
    ic.className = "banner__icon";
    ic.setAttribute("aria-hidden", "true");
    ic.innerHTML = icons[icon];
    const text = document.createElement("div");
    const h = document.createElement("strong");
    h.className = "banner__title";
    h.textContent = title;
    const p = document.createElement("p");
    p.className = "banner__body";
    p.textContent = bodyText;
    text.append(h, p);
    el.append(ic, text);
    return el;
  }

  const unsubscribe = session.onChange(render);

  return {
    destroy() {
      unsubscribe();
      hero.segmented.destroy();
      hero.toggle.destroy();
      wrapper.remove();
      document.title = originalTitle;
    },
  };
}
