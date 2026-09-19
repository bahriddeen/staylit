/**
 * Clock mode — Project B.
 *
 * Hosts the Digital and Flip sub-views behind one shared settings system and a
 * single ticker (only the active view is mounted, so only it renders). Uses the
 * app-wide session for the wake lock (so it stays in sync with Awake mode) and
 * renders its action icons into the shared app toolbar. Reports its background
 * color to the app so switches cross-fade.
 *
 * Switching between /clock and /flip happens in place via setView (no remount).
 */

import "./fonts.css";
import "./clock.css";
import "@fontsource-variable/oswald";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";

import { Ticker } from "../../core/ticker";
import { t, tRaw } from "../../core/i18n";
import { showToast } from "../../ui/toast";
import { icons } from "../../ui/icons";
import { clockToParams, clockFromParams, hasClockParams } from "./share";
import { buildShareUrl, copyToClipboard } from "../../ui/share";
import {
  toggleFullscreen,
  onFullscreenChange,
  isFullscreen,
} from "../../core/fullscreen";
import { applySeo, type FaqEntry } from "../../app/seo";
import type { AppSession } from "../../app/session";
import type { AppToolbar } from "../../app/switcher";
import type { ClockRenderer } from "./view";
import {
  loadSettings,
  saveSettings,
  loadScale,
  saveScale,
  clampScale,
  DEFAULT_SETTINGS,
  type ClockView,
  type ClockSettings,
} from "./settings";
import { isValidTemplate, digitalTemplate, flipTemplate } from "./templates";
import { toParts } from "./time";
import { createDigitalView } from "./digitalView";
import { createFlipView } from "./flipView";
import { createModeActions, type ModeActions } from "../../ui/modeActions";
import { createSettingsDrawer, type SettingsDrawer } from "./settingsDrawer";
import { createClockSections } from "./sections";
import { showGuideIfFirstMobileVisit } from "./guide";

export interface ClockMode {
  setView(view: ClockView): void;
  destroy(): void;
}

export interface ClockModeOptions {
  session: AppSession;
  toolbar: AppToolbar;
  /** Report the page background color so the app can cross-fade on switch. */
  setBackground(color: string): void;
}

const pathFor = (view: ClockView): string =>
  view === "digital" ? "/clock" : "/flip";

function sanitize(settings: ClockSettings, view: ClockView): ClockSettings {
  return isValidTemplate(view, settings.template)
    ? settings
    : { ...settings, template: DEFAULT_SETTINGS[view].template };
}

function backgroundFor(view: ClockView, settings: ClockSettings): string {
  return view === "digital"
    ? digitalTemplate(settings.template).vars["--clock-bg"]
    : flipTemplate(settings.template).vars["--page-bg"];
}

export function mountClockMode(
  root: HTMLElement,
  initialView: ClockView,
  options: ClockModeOptions,
): ClockMode {
  const { session, toolbar, setBackground } = options;
  const ticker = new Ticker();

  let view: ClockView = initialView;
  let settings: ClockSettings = sanitize(loadSettings(view), view);
  // A shared link (/clock?template=… or /flip?…) overrides stored settings for
  // this visit and is persisted so the look sticks.
  const urlParams = new URLSearchParams(window.location.search);
  if (hasClockParams(urlParams)) {
    settings = clockFromParams(view, settings, urlParams);
    saveSettings(view, settings);
  }
  let renderer: ClockRenderer;
  let drawer: SettingsDrawer;

  // ----- Shell -----
  const shell = document.createElement("div");
  shell.className = "clock";
  shell.dataset.view = view;

  const stage = document.createElement("div");
  stage.className = "clock-stage";

  let below = createClockSections(view);
  shell.append(stage, below);
  root.append(shell);

  // ----- Action icons (into the shared toolbar) -----
  // The dark-glass look (clock-nav__btn) suits sitting over the clock stage's
  // template-colored background, regardless of the site's light/dark theme.
  const actions: ModeActions = createModeActions({
    onSettings: () => drawer.open(),
    onWake: () => session.toggle(),
    onFullscreen: () => void enterOrExitFullscreen(),
  });
  for (const el of actions.elements) el.classList.add("clock-nav__btn");
  toolbar.setActions(actions.elements);

  // ----- Renderer + ticker -----
  function applyBackground(): void {
    setBackground(backgroundFor(view, settings));
  }

  function mountRenderer(): void {
    renderer = view === "digital" ? createDigitalView() : createFlipView();
    renderer.applySettings(settings);
    stage.appendChild(renderer.element);
    stage.style.setProperty("--clock-scale", String(loadScale(view)));
    applyBackground();
  }

  function renderNow(): void {
    renderer.render(toParts(new Date(), settings.format), Date.now(), settings);
  }

  mountRenderer();
  ticker.start(() => renderNow());

  // ----- Settings drawer -----
  function buildDrawer(): void {
    drawer = createSettingsDrawer(
      view,
      settings,
      (next) => {
        settings = next;
        saveSettings(view, settings);
        renderer.applySettings(settings);
        applyBackground();
        renderNow();
      },
      () => {
        const url = buildShareUrl(pathFor(view), clockToParams(settings));
        void copyToClipboard(url).then((ok) => {
          if (ok) showToast(t("common.linkCopied"), { icon: icons.share });
        });
      },
    );
  }
  buildDrawer();

  // ----- Wake lock indicator (shared session) -----
  const unsubSession = session.onChange((s) =>
    actions.setWakeActive(s.wake.wanted),
  );

  // ----- Fullscreen -----
  async function enterOrExitFullscreen(): Promise<void> {
    const nowFs = await toggleFullscreen(shell);
    if (nowFs) session.ensureWake(); // fullscreen implies keep-awake
  }
  const unsubFs = onFullscreenChange((activeFs) => {
    shell.dataset.fullscreen = String(activeFs);
    actions.setFullscreen(activeFs);
    toolbar.setAutoHide(activeFs);
  });
  shell.dataset.fullscreen = String(isFullscreen());

  // ----- Pinch-to-zoom + double-tap reset (mobile) -----
  const pinch = attachPinch(stage, view, () => view);

  // ----- SEO -----
  function applySeoFor(v: ClockView): void {
    applySeo({
      title: t(`clock.${v}.seo.title`),
      description: t(`clock.${v}.seo.description`),
      path: pathFor(v),
      faq: tRaw<FaqEntry[]>("clock.sections.faq.items"),
    });
  }
  applySeoFor(view);

  showGuideIfFirstMobileVisit();

  return {
    setView(v) {
      if (v === view) return;
      view = v;
      shell.dataset.view = v;
      settings = sanitize(loadSettings(v), v);
      renderer.destroy();
      mountRenderer();
      pinch.refresh();
      renderNow();
      drawer.destroy();
      buildDrawer();
      const newBelow = createClockSections(v);
      below.replaceWith(newBelow);
      below = newBelow;
      applySeoFor(v);
    },
    destroy() {
      ticker.stop();
      unsubSession();
      unsubFs();
      toolbar.setAutoHide(false);
      toolbar.clearActions();
      pinch.destroy();
      drawer.destroy();
      renderer.destroy();
      shell.remove();
    },
  };
}

/**
 * Two-finger pinch scales the clock (clamped 0.5–3, persisted per view); a
 * double-tap resets to 1. Uses pointer events and writes only a CSS variable.
 */
function attachPinch(
  stage: HTMLElement,
  initialView: ClockView,
  getView: () => ClockView,
): { refresh(): void; destroy(): void } {
  const pointers = new Map<number, { x: number; y: number }>();
  let startDist = 0;
  let startScale = 1;
  let scale = loadScale(initialView);
  let lastTap = 0;

  const dist = (): number => {
    const pts = [...pointers.values()];
    return Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
  };

  const onDown = (e: PointerEvent): void => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      startDist = dist();
      startScale = scale;
    }
  };

  const onMove = (e: PointerEvent): void => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && startDist > 0) {
      scale = clampScale((startScale * dist()) / startDist);
      stage.style.setProperty("--clock-scale", String(scale));
    }
  };

  const finishPointer = (e: PointerEvent): void => {
    const wasPinching = pointers.size === 2;
    pointers.delete(e.pointerId);
    if (wasPinching) saveScale(getView(), scale);

    if (!wasPinching && pointers.size === 0) {
      const now = Date.now();
      if (now - lastTap < 300) {
        scale = 1;
        stage.style.setProperty("--clock-scale", "1");
        saveScale(getView(), 1);
        lastTap = 0;
      } else {
        lastTap = now;
      }
    }
  };

  stage.addEventListener("pointerdown", onDown);
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerup", finishPointer);
  stage.addEventListener("pointercancel", finishPointer);

  return {
    refresh() {
      scale = loadScale(getView());
      stage.style.setProperty("--clock-scale", String(scale));
    },
    destroy() {
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", finishPointer);
      stage.removeEventListener("pointercancel", finishPointer);
    },
  };
}
