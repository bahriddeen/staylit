import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mountClockMode, type ClockMode } from "./index";
import { AppSession } from "../../app/session";
import { createAppToolbar, type AppToolbar } from "../../app/switcher";
import { t } from "../../core/i18n";

/**
 * End-to-end wiring for clock mode in jsdom (no Element.animate → flip swaps
 * instantly; no matchMedia → guide skipped). Drives the real orchestrator via
 * the DOM, with a shared session and the real app toolbar hosting the actions.
 */

class FakeSentinel extends EventTarget {
  released = false;
  release = vi.fn(async () => {
    this.released = true;
    this.dispatchEvent(new Event("release"));
  });
}

const requestSpy = vi.fn(async () => new FakeSentinel());

function installFakeWakeLock(): void {
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: { request: requestSpy },
  });
}

const byLabel = (root: ParentNode, label: string): HTMLElement =>
  root.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;

describe("Clock mode (integration)", () => {
  let container: HTMLElement;
  let mode: ClockMode;
  let session: AppSession;
  let toolbar: AppToolbar;
  const setBackground = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    requestSpy.mockClear();
    setBackground.mockClear();
    installFakeWakeLock();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 16, 13, 24, 5));
    container = document.createElement("div");
    document.body.appendChild(container);
    session = new AppSession();
    toolbar = createAppToolbar("digital", { onSelect: () => {} });
    document.body.appendChild(toolbar.element);
  });

  afterEach(() => {
    mode?.destroy();
    session?.dispose();
    toolbar?.destroy();
    container.remove();
    document.querySelectorAll(".modal").forEach((m) => m.remove());
    vi.useRealTimers();
    Reflect.deleteProperty(navigator as object, "wakeLock");
  });

  const mount = (view: "digital" | "flip" = "digital"): void => {
    mode = mountClockMode(container, view, { session, toolbar, setBackground });
  };

  it("renders the digital view with the current time and reports background", () => {
    mount("digital");
    const digital = container.querySelector(".digital")!;
    expect(digital.getAttribute("data-template")).toBe("digital");
    expect(container.querySelector(".dg--h")?.textContent).toBe("13");
    expect(container.querySelector(".dg--m")?.textContent).toBe("24");
    expect(container.querySelector(".dg--s")?.textContent).toBe("05");
    // Background cross-fade color reported to the app (Digital template bg).
    expect(setBackground).toHaveBeenCalledWith("#000000");
  });

  it("applies settings changes from the drawer instantly", () => {
    mount("digital");
    byLabel(toolbar.element, t("clock.buttons.settings")).click();

    const drawer = document.querySelector(".modal")!;
    const secondsSwitch = Array.from(
      drawer.querySelectorAll<HTMLElement>('[role="switch"]'),
    ).find(
      (el) =>
        drawer.querySelector(`#${el.getAttribute("aria-labelledby")}`)
          ?.textContent === t("clock.settings.second"),
    )!;
    secondsSwitch.click();
    expect(
      container.querySelector(".digital")?.getAttribute("data-seconds"),
    ).toBe("false");

    const blueTile = Array.from(
      drawer.querySelectorAll<HTMLElement>(".template-tile"),
    ).find((tile) => tile.textContent?.includes("Digital Blue"))!;
    blueTile.click();
    expect(
      container.querySelector(".digital")?.getAttribute("data-template"),
    ).toBe("digital-blue");
  });

  it("toggles the shared wake lock from the sun button", async () => {
    mount("digital");
    const sun = byLabel(toolbar.element, t("clock.buttons.keepOn"));
    sun.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(requestSpy).toHaveBeenCalled();
    expect(session.getState().wake.wanted).toBe(true);
    expect(sun.classList.contains("icon-button--active")).toBe(true);
  });

  it("switches to the flip view in place", () => {
    mount("digital");
    mode.setView("flip");
    expect(container.querySelector(".clock")?.getAttribute("data-view")).toBe(
      "flip",
    );
    expect(container.querySelectorAll(".flip-card").length).toBe(6);
    const h = container.querySelector(".flip-card .flip-card__upper span");
    expect(h?.textContent).toBe("1");
  });
});
