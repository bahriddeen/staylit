import { describe, it, expect } from "vitest";
import { toParts, colonOn, PLACEHOLDER } from "./time";

const at = (h: number, m: number, s: number): Date =>
  new Date(2026, 8, 16, h, m, s); // 2026-09-16, local time

describe("toParts (24H)", () => {
  it("zero-pads and has no am/pm", () => {
    expect(toParts(at(9, 5, 3), "24")).toEqual({
      hh: "09",
      mm: "05",
      ss: "03",
      ampm: "",
    });
    expect(toParts(at(23, 59, 59), "24")).toEqual({
      hh: "23",
      mm: "59",
      ss: "59",
      ampm: "",
    });
  });
});

describe("toParts (12H)", () => {
  it("maps midnight and noon correctly", () => {
    expect(toParts(at(0, 0, 0), "12")).toMatchObject({ hh: "12", ampm: "AM" });
    expect(toParts(at(12, 0, 0), "12")).toMatchObject({ hh: "12", ampm: "PM" });
  });

  it("uses 1–12 with the right meridiem", () => {
    expect(toParts(at(13, 7, 0), "12")).toMatchObject({ hh: "01", ampm: "PM" });
    expect(toParts(at(9, 0, 0), "12")).toMatchObject({ hh: "09", ampm: "AM" });
  });
});

describe("colonOn", () => {
  it("is on for the first half of the second", () => {
    expect(colonOn(1000)).toBe(true);
    expect(colonOn(1499)).toBe(true);
    expect(colonOn(1500)).toBe(false);
    expect(colonOn(1999)).toBe(false);
  });
});

describe("PLACEHOLDER", () => {
  it("renders dashes to avoid layout shift before first tick", () => {
    expect(PLACEHOLDER).toEqual({ hh: "--", mm: "--", ss: "--", ampm: "" });
  });
});
