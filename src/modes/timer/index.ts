/**
 * Timer mode: Countdown (Simple / Interval / Bell) and Stopwatch, in a
 * full-viewport stage with a non-blocking settings panel, fullscreen, and the
 * shared wake-lock session — the same shape as the Digital/Flip clock modes,
 * so it behaves consistently with the rest of the app even though it has no
 * color templates (it follows the site's normal light/dark theme instead).
 *
 * The settings panel has no backdrop (see settingsPanel.ts) so the Play/Pause/
 * Reset controls stay clickable while it's open, matching the reference site.
 */

import "./timer.css";

import { t } from "../../core/i18n";
import { showToast } from "../../ui/toast";
import { icons } from "../../ui/icons";
import {
  toggleFullscreen,
  onFullscreenChange,
  isFullscreen,
} from "../../core/fullscreen";
import { applySeo } from "../../app/seo";
import type { AppSession } from "../../app/session";
import type { AppToolbar } from "../../app/switcher";
import { createModeActions, type ModeActions } from "../../ui/modeActions";
import { TimerEngine, type TimerState } from "./logic";
import { loadTimerSettings, saveTimerSettings } from "./settings";
import { timerToParams, timerFromParams, hasTimerParams } from "./share";
import { buildShareUrl, copyToClipboard } from "../../ui/share";
import { createTimerView, type TimerView } from "./view";
import {
  createTimerSettingsPanel,
  type TimerSettingsPanel,
} from "./settingsPanel";
import { createTimerSections } from "./sections";

export interface TimerMode {
  destroy(): void;
}

export interface TimerModeOptions {
  session: AppSession;
  toolbar: AppToolbar;
  setBackground(color: string): void;
}

export function mountTimerMode(
  root: HTMLElement,
  options: TimerModeOptions,
): TimerMode {
  const { session, toolbar, setBackground } = options;

  let settings = loadTimerSettings();
  // A shared link (/timer?...) overrides stored settings for this visit and is
  // then persisted, so the config sticks.
  const urlParams = new URLSearchParams(window.location.search);
  if (hasTimerParams(urlParams)) {
    settings = timerFromParams(settings, urlParams);
    saveTimerSettings(settings);
  }
  const engine = new TimerEngine(settings);

  const shell = document.createElement("div");
  shell.className = "timer";

  const view: TimerView = createTimerView({
    onStart: () => {
      engine.start();
      session.ensureWake();
    },
    onPause: () => engine.pause(),
    onReset: () => engine.reset(),
    onSplit: () => engine.split(),
  });

  const below = createTimerSections();
  shell.append(view.element, below);
  root.append(shell);
  setBackground("");

  // ----- Settings panel (non-blocking, no backdrop) -----
  const panel: TimerSettingsPanel = createTimerSettingsPanel(
    settings,
    (next) => {
      settings = next;
      saveTimerSettings(settings);
      engine.configure(settings);
    },
    () => {
      const url = buildShareUrl("/timer", timerToParams(settings));
      void copyToClipboard(url).then((ok) => {
        if (ok) showToast(t("common.linkCopied"), { icon: icons.share });
      });
    },
  );
  shell.append(panel.element);

  // ----- Action icons (settings, keep-screen-on, fullscreen) -----
  const actions: ModeActions = createModeActions({
    onSettings: () => panel.toggle(),
    onWake: () => session.toggle(),
    onFullscreen: () => void enterOrExitFullscreen(),
  });
  toolbar.setActions(actions.elements);

  const unsubSession = session.onChange((s) =>
    actions.setWakeActive(s.wake.wanted),
  );

  // ----- Fullscreen -----
  async function enterOrExitFullscreen(): Promise<void> {
    const nowFs = await toggleFullscreen(shell);
    if (nowFs) session.ensureWake();
  }
  const unsubFs = onFullscreenChange((activeFs) => {
    shell.dataset.fullscreen = String(activeFs);
    actions.setFullscreen(activeFs);
    toolbar.setAutoHide(activeFs);
  });
  shell.dataset.fullscreen = String(isFullscreen());

  // ----- Engine -----
  let previousStatus: TimerState["status"] = "idle";
  const unsubEngine = engine.onChange((state) => {
    view.render(state, settings);
    if (state.status === "finished" && previousStatus !== "finished") {
      showToast(t("timer.toast.finished"), { icon: icons.clock });
    }
    previousStatus = state.status;
  });

  // ----- SEO -----
  applySeo({
    title: t("timer.seo.title"),
    description: t("timer.seo.description"),
    path: "/timer",
    faq: [],
  });

  return {
    destroy() {
      unsubEngine();
      unsubSession();
      unsubFs();
      toolbar.setAutoHide(false);
      toolbar.clearActions();
      engine.destroy();
      panel.destroy();
      shell.remove();
    },
  };
}
