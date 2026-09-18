/**
 * The app toolbar: mode-specific action icons (fixed top-right) + the mode
 * switcher pill (fixed top-left) — two independently positioned groups that
 * both hide together in fullscreen.
 *
 * The switcher is a glass, pill-shaped segmented control (Awake / Digital /
 * Flip / Timer) with a sliding highlight thumb, tablist keyboard support
 * (arrow keys), a countdown badge on the Awake segment, an icons-only collapse
 * under 480px, and an auto-hide mode used in fullscreen.
 */

import { t } from "../core/i18n";
import { icons } from "../ui/icons";

export type AppMode = "awake" | "digital" | "flip" | "timer";

export interface ToolbarHandlers {
  onSelect(mode: AppMode): void;
}

export interface AppToolbar {
  element: HTMLElement;
  setActiveMode(mode: AppMode): void;
  /** Place mode action icons to the left of the switcher. */
  setActions(nodes: HTMLElement[]): void;
  clearActions(): void;
  /** Countdown text on the Awake segment, or null to clear. */
  setBadge(text: string | null): void;
  /** Auto-hide after inactivity (used in fullscreen). */
  setAutoHide(enabled: boolean): void;
  destroy(): void;
}

const MODES: { mode: AppMode; icon: keyof typeof icons }[] = [
  { mode: "awake", icon: "sun" },
  { mode: "digital", icon: "display" },
  { mode: "flip", icon: "layers" },
  { mode: "timer", icon: "hourglass" },
];

const HIDE_DELAY = 3000;

export function createAppToolbar(
  active: AppMode,
  handlers: ToolbarHandlers,
): AppToolbar {
  const root = document.createElement("div");
  root.className = "app-toolbar";

  const actions = document.createElement("div");
  actions.className = "app-toolbar__actions";

  const pill = document.createElement("div");
  pill.className = "mode-switcher";
  pill.setAttribute("role", "tablist");
  pill.setAttribute("aria-label", t("switcher.label"));

  const thumb = document.createElement("div");
  thumb.className = "mode-switcher__thumb";
  thumb.setAttribute("aria-hidden", "true");
  pill.appendChild(thumb);

  const tabs = new Map<AppMode, HTMLButtonElement>();
  let badge: HTMLElement | null = null;
  let current = active;

  MODES.forEach(({ mode, icon }) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "mode-switcher__tab";
    tab.setAttribute("role", "tab");
    tab.dataset.mode = mode;

    const ic = document.createElement("span");
    ic.className = "mode-switcher__icon";
    ic.setAttribute("aria-hidden", "true");
    ic.innerHTML = icons[icon];

    const label = document.createElement("span");
    label.className = "mode-switcher__label";
    label.textContent = t(`switcher.${mode}`);

    tab.append(ic, label);

    if (mode === "awake") {
      badge = document.createElement("span");
      badge.className = "mode-switcher__badge";
      badge.hidden = true;
      tab.appendChild(badge);
    }

    tab.addEventListener("click", () => handlers.onSelect(mode));
    tab.addEventListener("keydown", (e) => onKeydown(e, mode));
    tabs.set(mode, tab);
    pill.appendChild(tab);
  });

  root.append(actions, pill);

  function onKeydown(e: KeyboardEvent, mode: AppMode): void {
    const order = MODES.map((m) => m.mode);
    const i = order.indexOf(mode);
    let next: AppMode | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = order[(i + 1) % order.length]!;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = order[(i - 1 + order.length) % order.length]!;
    }
    if (next) {
      e.preventDefault();
      tabs.get(next)?.focus();
      handlers.onSelect(next);
    }
  }

  function updateThumb(): void {
    const tab = tabs.get(current);
    if (!tab) return;
    thumb.style.width = `${tab.offsetWidth}px`;
    thumb.style.transform = `translateX(${tab.offsetLeft}px)`;
  }

  function setActiveMode(mode: AppMode): void {
    current = mode;
    for (const [m, tab] of tabs) {
      const selected = m === mode;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.classList.toggle("mode-switcher__tab--active", selected);
    }
    requestAnimationFrame(updateThumb);
  }
  setActiveMode(active);

  const onResize = (): void => updateThumb();
  window.addEventListener("resize", onResize, { passive: true });
  // Recompute once fonts settle (label widths can change).
  requestAnimationFrame(() => requestAnimationFrame(updateThumb));

  // ----- Auto-hide -----
  let autoHide = false;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  const show = (): void => root.classList.remove("app-toolbar--hidden");
  const hide = (): void => root.classList.add("app-toolbar--hidden");
  const scheduleHide = (): void => {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => autoHide && hide(), HIDE_DELAY);
  };
  const onActivity = (): void => {
    if (!autoHide) return;
    show();
    scheduleHide();
  };

  return {
    element: root,
    setActiveMode,
    setActions(nodes) {
      actions.replaceChildren(...nodes);
    },
    clearActions() {
      actions.replaceChildren();
    },
    setBadge(text) {
      if (!badge) return;
      if (text) {
        badge.textContent = text;
        badge.hidden = false;
      } else {
        badge.hidden = true;
      }
      requestAnimationFrame(updateThumb);
    },
    setAutoHide(enabled) {
      autoHide = enabled;
      if (enabled) {
        document.addEventListener("mousemove", onActivity, { passive: true });
        document.addEventListener("touchstart", onActivity, { passive: true });
        scheduleHide();
      } else {
        document.removeEventListener("mousemove", onActivity);
        document.removeEventListener("touchstart", onActivity);
        if (hideTimer) clearTimeout(hideTimer);
        show();
      }
    },
    destroy() {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("mousemove", onActivity);
      document.removeEventListener("touchstart", onActivity);
      if (hideTimer) clearTimeout(hideTimer);
      root.remove();
    },
  };
}
