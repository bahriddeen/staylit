import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AppSession } from "./session";

class FakeSentinel extends EventTarget {
  released = false;
  release = vi.fn(async () => {
    this.released = true;
    this.dispatchEvent(new Event("release"));
  });
}

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("AppSession", () => {
  let session: AppSession;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0));
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: { request: vi.fn(async () => new FakeSentinel()) },
    });
    session = new AppSession();
  });

  afterEach(() => {
    session.dispose();
    vi.useRealTimers();
    Reflect.deleteProperty(navigator as object, "wakeLock");
    document.querySelectorAll(".toast").forEach((el) => el.remove());
  });

  it("start(null) is always-on (no countdown)", async () => {
    session.start(null);
    await flush();
    const s = session.getState();
    expect(s.wake.wanted).toBe(true);
    expect(s.timed).toBe(false);
  });

  it("start(ms) runs a countdown that decreases over time", async () => {
    session.start(60_000);
    await flush();
    expect(session.getState().timed).toBe(true);
    expect(session.getState().remainingMs).toBe(60_000);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(session.getState().remainingMs).toBeLessThanOrEqual(50_000);
  });

  it("finishes at zero: releases, clears the timer, and toasts", async () => {
    session.start(1_000);
    await flush();
    await vi.advanceTimersByTimeAsync(1_500);
    const s = session.getState();
    expect(s.wake.wanted).toBe(false);
    expect(s.timed).toBe(false);
    expect(document.querySelector(".toast")).not.toBeNull();
  });

  it("toggle flips between always-on and off", async () => {
    session.toggle();
    await flush();
    expect(session.getState().wake.wanted).toBe(true);
    session.toggle();
    await flush();
    expect(session.getState().wake.wanted).toBe(false);
  });

  it("ensureWake turns it on only when off", async () => {
    session.ensureWake();
    await flush();
    expect(session.getState().wake.wanted).toBe(true);
    expect(session.getState().timed).toBe(false);
  });
});
