import { afterEach, describe, expect, it, vi } from "vitest";
import { initAnalytics, track } from "./analytics";

describe("analytics", () => {
  afterEach(() => {
    delete window.umami;
  });

  it("does not inject a script when no website id is configured", () => {
    initAnalytics();
    expect(document.querySelector("script[data-website-id]")).toBeNull();
  });

  it("forwards events to Umami when it is loaded", () => {
    const spy = vi.fn();
    window.umami = { track: spy };
    track("wake-on", { timed: true });
    expect(spy).toHaveBeenCalledWith("wake-on", { timed: true });
  });

  it("never throws when Umami is missing or fails", () => {
    expect(() => track("wake-on")).not.toThrow();
    window.umami = {
      track: () => {
        throw new Error("blocked");
      },
    };
    expect(() => track("wake-on")).not.toThrow();
  });
});
