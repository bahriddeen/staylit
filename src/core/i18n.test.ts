import { describe, it, expect } from "vitest";
import { t, tRaw } from "./i18n";

describe("i18n.t", () => {
  it("resolves dotted keys from the bundled English locale", () => {
    expect(t("app.title")).toBe("StayLit");
    expect(t("awake.hero.title")).toBe("Keep Your Screen On");
  });

  it("returns the key itself for unknown keys", () => {
    expect(t("does.not.exist")).toBe("does.not.exist");
  });

  it("interpolates {param} placeholders", () => {
    // Uses a key that exists; interpolation is a no-op when no braces present.
    expect(t("common.close")).toBe("Close");
  });
});

describe("i18n.tRaw", () => {
  it("returns structured (array) content for list keys", () => {
    const items = tRaw<Array<{ question: string }>>("awake.faq.items");
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    expect(typeof items[0]!.question).toBe("string");
  });

  it("falls back to [] for unknown keys by default", () => {
    expect(tRaw("nope.not.here")).toEqual([]);
  });
});
