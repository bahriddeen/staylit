import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mountAwakeMode, type AwakeMode } from "./index";
import { AppSession } from "../../app/session";
import { t } from "../../core/i18n";

/**
 * End-to-end wiring test for Awake mode. Mounts the real controller + view into
 * jsdom with a fake Wake Lock API and fake timers, then drives it through the
 * DOM the way a user would.
 */

class FakeSentinel extends EventTarget {
  released = false;
  release = vi.fn(async () => {
    this.released = true;
    this.dispatchEvent(new Event("release"));
  });
}

function installFakeWakeLock(): void {
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: { request: vi.fn(async () => new FakeSentinel()) },
  });
}

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

const toggleButton = (root: HTMLElement): HTMLButtonElement =>
  root.querySelector<HTMLButtonElement>('[role="switch"]')!;

const pillByLabel = (root: HTMLElement, label: string): HTMLButtonElement =>
  Array.from(root.querySelectorAll<HTMLButtonElement>('[role="radio"]')).find(
    (b) => b.textContent === label,
  )!;

describe("Awake mode (integration)", () => {
  let container: HTMLElement;
  let mode: AwakeMode;
  let session: AppSession;

  beforeEach(() => {
    localStorage.clear();
    installFakeWakeLock();
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    session = new AppSession();
  });

  afterEach(() => {
    mode?.destroy();
    session?.dispose();
    container.remove();
    vi.useRealTimers();
    Reflect.deleteProperty(navigator as object, "wakeLock");
  });

  it("renders the hero, content sections, and footer", () => {
    mode = mountAwakeMode(container, session);
    expect(container.querySelector("h1")?.textContent).toBe(
      t("awake.hero.title"),
    );
    // Content sections + FAQ accordion + footer are present.
    expect(container.querySelectorAll("details.faq__item").length).toBe(5);
    expect(container.querySelector(".site-footer")).not.toBeNull();
    // Starts off with the "can sleep normally" message.
    expect(container.querySelector(".hero__status")?.textContent).toBe(
      t("awake.status.off"),
    );
  });

  it("turns on for always-on: requests the lock and shows the ∞ status", async () => {
    mode = mountAwakeMode(container, session);
    toggleButton(container).click();
    await flush();

    expect(
      (
        navigator as unknown as {
          wakeLock: { request: ReturnType<typeof vi.fn> };
        }
      ).wakeLock.request,
    ).toHaveBeenCalled();
    expect(container.querySelector(".hero__countdown")?.textContent).toBe(
      t("awake.status.alwaysOn"),
    );
    expect(document.title.startsWith("●")).toBe(true);
  });

  it("runs a countdown and finishes: releases, flips off, and toasts", async () => {
    mode = mountAwakeMode(container, session);

    // Choose a 1-minute custom duration.
    pillByLabel(container, t("awake.duration.custom")).click();
    const minutes =
      container.querySelectorAll<HTMLInputElement>(".num-field__input")[1]!;
    minutes.value = "1";
    minutes.dispatchEvent(new Event("input"));

    toggleButton(container).click();
    await flush();

    // Mid-countdown the title carries the timer glyph.
    expect(document.title).toContain("⏱");
    expect(container.querySelector(".hero__countdown")).not.toBeNull();

    // Advance past the end.
    await vi.advanceTimersByTimeAsync(61_000);

    expect(toggleButton(container).getAttribute("aria-checked")).toBe("false");
    const toast = document.body.querySelector(".toast");
    expect(toast?.textContent).toContain(t("awake.toast.finished"));
    expect(document.title).not.toContain("⏱");
  });
});
