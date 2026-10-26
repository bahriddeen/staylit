import { afterEach, describe, expect, it, vi } from "vitest";
import { initAnalytics, resolveWebsiteId, track } from "./analytics";

describe("analytics", () => {
  afterEach(() => {
    delete window.umami;
  });

  it("uses the production site id only on staylit.live", () => {
    expect(resolveWebsiteId("staylit.live", undefined)).toBe(
      "ade4e16f-f666-4adf-8eae-95d177e9eaaf",
    );
    expect(resolveWebsiteId("localhost", undefined)).toBeUndefined();
    expect(resolveWebsiteId("my-fork.vercel.app", undefined)).toBeUndefined();
  });

  it("lets VITE_UMAMI_WEBSITE_ID override the site id on any host", () => {
    expect(resolveWebsiteId("localhost", "custom-id")).toBe("custom-id");
    expect(resolveWebsiteId("staylit.live", "custom-id")).toBe("custom-id");
  });

  it("does not inject a script off the production host", () => {
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
