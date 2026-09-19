import { describe, it, expect } from "vitest";
import {
  ALARM_TONES,
  ALARM_PATTERNS,
  toneDuration,
  clampVolume,
} from "./audio";

describe("alarm tone registry", () => {
  it("every listed tone has a non-empty, well-formed pattern", () => {
    for (const tone of ALARM_TONES) {
      const pattern = ALARM_PATTERNS[tone];
      expect(pattern.length).toBeGreaterThan(0);
      for (const blip of pattern) {
        expect(blip.freq).toBeGreaterThan(0);
        expect(blip.at).toBeGreaterThanOrEqual(0);
        expect(blip.dur).toBeGreaterThan(0);
        expect(blip.gain).toBeGreaterThan(0);
        expect(blip.gain).toBeLessThanOrEqual(0.32);
      }
    }
  });

  it("toneDuration returns the end of the last blip", () => {
    expect(toneDuration("beep")).toBeCloseTo(0.28);
    // chime's last blip starts at 0.4 with dur 0.32.
    expect(toneDuration("chime")).toBeCloseTo(0.72);
  });
});

describe("clampVolume", () => {
  it("clamps to the 0–1 range", () => {
    expect(clampVolume(-0.5)).toBe(0);
    expect(clampVolume(0.6)).toBe(0.6);
    expect(clampVolume(2)).toBe(1);
  });

  it("falls back to full volume for NaN", () => {
    expect(clampVolume(Number.NaN)).toBe(1);
  });
});
