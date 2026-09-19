import { describe, it, expect } from "vitest";
import { clockToParams, clockFromParams, hasClockParams } from "./share";
import { DEFAULT_SETTINGS, type ClockSettings } from "./settings";

const digital = (over: Partial<ClockSettings> = {}): ClockSettings => ({
  ...DEFAULT_SETTINGS.digital,
  ...over,
});

describe("clock share round-trip", () => {
  it("serializes and parses back a digital config unchanged", () => {
    const settings = digital({
      template: "digital-blue",
      format: "12",
      seconds: false,
      dayAndYear: true,
    });
    const params = clockToParams(settings);
    expect(
      clockFromParams("digital", DEFAULT_SETTINGS.digital, params),
    ).toEqual(settings);
  });

  it("rejects a template that doesn't belong to the view", () => {
    // "green" is a flip template, not a digital one.
    const parsed = clockFromParams(
      "digital",
      DEFAULT_SETTINGS.digital,
      new URLSearchParams("template=green"),
    );
    expect(parsed.template).toBe(DEFAULT_SETTINGS.digital.template);
  });

  it("accepts a valid flip template for the flip view", () => {
    const parsed = clockFromParams(
      "flip",
      DEFAULT_SETTINGS.flip,
      new URLSearchParams("template=green&format=12"),
    );
    expect(parsed.template).toBe("green");
    expect(parsed.format).toBe("12");
  });

  it("keeps base values for absent params", () => {
    const parsed = clockFromParams(
      "digital",
      digital({ seconds: false }),
      new URLSearchParams("format=12"),
    );
    expect(parsed.seconds).toBe(false);
    expect(parsed.format).toBe("12");
  });
});

describe("hasClockParams", () => {
  it("detects shared links vs empty query", () => {
    expect(hasClockParams(new URLSearchParams(""))).toBe(false);
    expect(hasClockParams(new URLSearchParams("template=dark"))).toBe(true);
  });
});
