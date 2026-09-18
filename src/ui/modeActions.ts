/**
 * Shared action icons (settings, keep-screen-on, fullscreen) rendered into the
 * app toolbar's actions slot, to the left of the mode switcher. Used by any
 * full-viewport-stage mode (Digital, Flip, Timer) that needs a settings drawer
 * plus wake-lock and fullscreen controls.
 */

import { t } from "../core/i18n";
import { icons } from "./icons";

export interface ModeActionHandlers {
  onSettings(): void;
  onWake(): void;
  onFullscreen(): void;
}

export interface ModeActions {
  elements: HTMLElement[];
  setWakeActive(active: boolean): void;
  setFullscreen(active: boolean): void;
}

function iconButton(label: string, svg: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "icon-button";
  btn.setAttribute("aria-label", label);
  btn.title = label;
  btn.innerHTML = svg;
  return btn;
}

export function createModeActions(handlers: ModeActionHandlers): ModeActions {
  const settingsBtn = iconButton(t("clock.buttons.settings"), icons.gear);
  settingsBtn.addEventListener("click", handlers.onSettings);

  // "Live" broadcast mark, not sun/eye/bulb — the sun is already used for the
  // light/dark theme toggle, so this needs a distinct "on air" metaphor for
  // "keep this screen on".
  const wakeBtn = iconButton(t("clock.buttons.keepOn"), icons.live);
  wakeBtn.setAttribute("aria-pressed", "false");
  wakeBtn.addEventListener("click", handlers.onWake);

  const fsBtn = iconButton(t("clock.buttons.fullscreen"), icons.fullscreen);
  fsBtn.addEventListener("click", handlers.onFullscreen);

  return {
    elements: [wakeBtn, fsBtn, settingsBtn],
    setWakeActive(active) {
      wakeBtn.classList.toggle("icon-button--active", active);
      wakeBtn.setAttribute("aria-pressed", String(active));
      const label = active
        ? t("clock.buttons.keepOnActive")
        : t("clock.buttons.keepOn");
      wakeBtn.setAttribute("aria-label", label);
      wakeBtn.title = label;
    },
    setFullscreen(active) {
      fsBtn.innerHTML = active ? icons.exitFullscreen : icons.fullscreen;
      const label = active
        ? t("clock.buttons.exitFullscreen")
        : t("clock.buttons.fullscreen");
      fsBtn.setAttribute("aria-label", label);
      fsBtn.title = label;
    },
  };
}
