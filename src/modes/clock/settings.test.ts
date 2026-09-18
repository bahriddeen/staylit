import { describe, it, expect, beforeEach } from "vitest";
import {
  loadSettings,
  saveSettings,
  loadScale,
  saveScale,
  clampScale,
  DEFAULT_SETTINGS,
} from "./settings";
import { isValidTemplate } from "./templates";

describe("clock settings", () => {
  beforeEach(() => localStorage.clear());

  it("returns per-view defaults when nothing stored", () => {
    expect(loadSettings("digital")).toEqual(DEFAULT_SETTINGS.digital);
    expect(loadSettings("flip")).toEqual(DEFAULT_SETTINGS.flip);
  });

  it("persists settings independently per view", () => {
    saveSettings("digital", { ...DEFAULT_SETTINGS.digital, format: "12" });
    expect(loadSettings("digital").format).toBe("12");
    expect(loadSettings("flip").format).toBe("24"); // untouched
  });

  it("merges over defaults so new fields survive upgrades", () => {
    localStorage.setItem(
      "awake-clock:clock.settings.digital",
      JSON.stringify({ format: "12" }),
    );
    const s = loadSettings("digital");
    expect(s.format).toBe("12");
    expect(s.seconds).toBe(DEFAULT_SETTINGS.digital.seconds);
  });
});

describe("scale", () => {
  beforeEach(() => localStorage.clear());

  it("clamps to 0.5–3", () => {
    expect(clampScale(0.1)).toBe(0.5);
    expect(clampScale(9)).toBe(3);
    expect(clampScale(1.5)).toBe(1.5);
    expect(clampScale(NaN)).toBe(1);
  });

  it("round-trips per view and clamps on read", () => {
    saveScale("flip", 2.2);
    expect(loadScale("flip")).toBeCloseTo(2.2);
    saveScale("flip", 99);
    expect(loadScale("flip")).toBe(3);
  });
});

describe("isValidTemplate", () => {
  it("validates against the correct view's list", () => {
    expect(isValidTemplate("digital", "digital-blue")).toBe(true);
    expect(isValidTemplate("digital", "green")).toBe(false);
    expect(isValidTemplate("flip", "green")).toBe(true);
    expect(isValidTemplate("flip", "digital-blue")).toBe(false);
  });
});
