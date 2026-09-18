import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WakeLock } from "./wakeLock";

/**
 * jsdom has no navigator.wakeLock, so we install a controllable fake that mimics
 * the sentinel + 'release' event. This exercises the real state machine:
 * request -> active(native), release -> inactive, and the onChange contract.
 */

class FakeSentinel extends EventTarget {
  released = false;
  release = vi.fn(async () => {
    this.released = true;
    this.dispatchEvent(new Event("release"));
  });
}

function installFakeApi(): { requests: FakeSentinel[] } {
  const requests: FakeSentinel[] = [];
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: {
      request: vi.fn(async (type: string) => {
        expect(type).toBe("screen");
        const s = new FakeSentinel();
        requests.push(s);
        return s;
      }),
    },
  });
  return { requests };
}

function removeApi(): void {
  Reflect.deleteProperty(navigator as object, "wakeLock");
}

describe("WakeLock (native path)", () => {
  afterEach(() => removeApi());

  it("reports supported when the API exists", () => {
    installFakeApi();
    const wl = new WakeLock();
    expect(wl.isSupported).toBe(true);
    wl.dispose();
  });

  it("becomes active after request() and inactive after release()", async () => {
    installFakeApi();
    const wl = new WakeLock();
    const states: boolean[] = [];
    wl.onChange((s) => states.push(s.active));

    await wl.request();
    expect(wl.isActive).toBe(true);
    expect(wl.getState().method).toBe("native");

    await wl.release();
    expect(wl.isActive).toBe(false);
    expect(wl.getState().method).toBe("none");
    // Initial emit (false) + active (true) + released (false) all observed.
    expect(states).toContain(true);
    expect(states.at(-1)).toBe(false);
    wl.dispose();
  });

  it("re-requests when the tab becomes visible again if still wanted", async () => {
    const { requests } = installFakeApi();
    const wl = new WakeLock();
    await wl.request();
    expect(requests.length).toBe(1);

    // Simulate the OS dropping the lock while hidden.
    requests[0]!.dispatchEvent(new Event("release"));
    expect(wl.isActive).toBe(false);

    // Tab visible again -> should re-acquire because the user still wants it.
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await Promise.resolve();
    await Promise.resolve();

    expect(requests.length).toBe(2);
    expect(wl.isActive).toBe(true);
    wl.dispose();
  });
});

describe("WakeLock (unsupported path)", () => {
  beforeEach(() => removeApi());

  it("reports unsupported and never throws to the caller", async () => {
    const wl = new WakeLock();
    expect(wl.isSupported).toBe(false);
    // Video fallback can't truly play in jsdom, but request() must not reject.
    await expect(wl.request()).resolves.toBeUndefined();
    await expect(wl.release()).resolves.toBeUndefined();
    wl.dispose();
  });
});
