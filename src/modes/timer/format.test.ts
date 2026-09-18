import { describe, it, expect } from "vitest";
import { formatStopwatch, formatStopwatchParts } from "./format";

describe("formatStopwatch", () => {
  it("floors to whole seconds without milliseconds", () => {
    expect(formatStopwatch(0, false)).toBe("00:00:00");
    expect(formatStopwatch(999, false)).toBe("00:00:00");
    expect(formatStopwatch(1000, false)).toBe("00:00:01");
    expect(formatStopwatch(3_661_000, false)).toBe("01:01:01");
  });

  it("appends full milliseconds when requested", () => {
    expect(formatStopwatch(1234, true)).toBe("00:00:01.234");
    expect(formatStopwatch(0, true)).toBe("00:00:00.000");
  });

  it("never goes negative", () => {
    expect(formatStopwatch(-500, false)).toBe("00:00:00");
  });
});

describe("formatStopwatchParts", () => {
  it("splits the first millisecond digit from the last two", () => {
    expect(formatStopwatchParts(17_512)).toEqual({
      main: "00:00:17.5",
      fraction: "12",
    });
    expect(formatStopwatchParts(0)).toEqual({
      main: "00:00:00.0",
      fraction: "00",
    });
  });

  it("never goes negative", () => {
    expect(formatStopwatchParts(-500)).toEqual({
      main: "00:00:00.0",
      fraction: "00",
    });
  });
});
