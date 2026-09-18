import { describe, it, expect } from "vitest";
import { Ticker } from "./ticker";

describe("Ticker.msUntilNextSecond", () => {
  it("returns a full second when exactly on a boundary", () => {
    expect(Ticker.msUntilNextSecond(1000)).toBe(1000);
    expect(Ticker.msUntilNextSecond(0)).toBe(1000);
  });

  it("returns the remaining ms to the next boundary", () => {
    expect(Ticker.msUntilNextSecond(1)).toBe(999);
    expect(Ticker.msUntilNextSecond(1500)).toBe(500);
    expect(Ticker.msUntilNextSecond(1999)).toBe(1);
  });

  it("always lands within (0, 1000]", () => {
    for (let i = 0; i < 5000; i += 137) {
      const ms = Ticker.msUntilNextSecond(i);
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThanOrEqual(1000);
    }
  });

  it("stepping by the returned delay lands on a boundary", () => {
    const now = 1234567890123;
    const next = now + Ticker.msUntilNextSecond(now);
    expect(next % 1000).toBe(0);
  });
});
