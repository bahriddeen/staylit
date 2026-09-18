import { describe, it, expect } from "vitest";
import {
  selectionToMs,
  clampCustom,
  remainingMs,
  formatHMS,
  isTimed,
  type DurationSelection,
} from "./durations";

const sel = (over: Partial<DurationSelection>): DurationSelection => ({
  preset: "always",
  hours: 0,
  minutes: 0,
  ...over,
});

describe("selectionToMs", () => {
  it("returns null for always-on", () => {
    expect(selectionToMs(sel({ preset: "always" }))).toBeNull();
  });

  it("maps fixed presets to milliseconds", () => {
    expect(selectionToMs(sel({ preset: "10m" }))).toBe(600_000);
    expect(selectionToMs(sel({ preset: "30m" }))).toBe(1_800_000);
    expect(selectionToMs(sel({ preset: "1h" }))).toBe(3_600_000);
    expect(selectionToMs(sel({ preset: "2h" }))).toBe(7_200_000);
  });

  it("computes custom hours + minutes", () => {
    expect(
      selectionToMs(sel({ preset: "custom", hours: 1, minutes: 30 })),
    ).toBe(5_400_000);
  });

  it("treats a zero custom duration as always-on (null)", () => {
    expect(
      selectionToMs(sel({ preset: "custom", hours: 0, minutes: 0 })),
    ).toBeNull();
  });
});

describe("clampCustom", () => {
  it("clamps hours to 0–23 and minutes to 0–59", () => {
    expect(clampCustom(-5, 99)).toEqual({ hours: 0, minutes: 59 });
    expect(clampCustom(50, -1)).toEqual({ hours: 23, minutes: 0 });
  });

  it("falls back to the minimum on NaN", () => {
    expect(clampCustom(NaN, NaN)).toEqual({ hours: 0, minutes: 0 });
  });
});

describe("isTimed", () => {
  it("is false for always and zero-custom, true otherwise", () => {
    expect(isTimed(sel({ preset: "always" }))).toBe(false);
    expect(isTimed(sel({ preset: "custom", hours: 0, minutes: 0 }))).toBe(
      false,
    );
    expect(isTimed(sel({ preset: "1h" }))).toBe(true);
  });
});

describe("remainingMs", () => {
  it("returns the gap and never goes negative", () => {
    expect(remainingMs(1000, 400)).toBe(600);
    expect(remainingMs(1000, 5000)).toBe(0);
  });
});

describe("formatHMS", () => {
  it("formats and zero-pads, rounding up partial seconds", () => {
    expect(formatHMS(0)).toBe("00:00:00");
    expect(formatHMS(999)).toBe("00:00:01");
    expect(formatHMS(1000)).toBe("00:00:01");
    expect(formatHMS(61_000)).toBe("00:01:01");
    expect(formatHMS(3_661_000)).toBe("01:01:01");
    expect(formatHMS(86_399_000)).toBe("23:59:59");
  });
});
