import { describe, it, expect, beforeEach } from "vitest";
import { createStorage } from "./storage";

describe("createStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns the default when nothing is stored", () => {
    const store = createStorage("count", 42);
    expect(store.get()).toBe(42);
  });

  it("round-trips values through JSON", () => {
    const store = createStorage("obj", { a: 1 });
    expect(store.set({ a: 2 })).toBe(true);
    expect(store.get()).toEqual({ a: 2 });
  });

  it("namespaces keys under awake-clock:", () => {
    const store = createStorage("theme", "dark");
    store.set("light");
    expect(localStorage.getItem("awake-clock:theme")).toBe('"light"');
  });

  it("update() reads, transforms, and writes", () => {
    const store = createStorage("n", 1);
    store.update((n) => n + 4);
    expect(store.get()).toBe(5);
  });

  it("returns the default on malformed JSON instead of throwing", () => {
    localStorage.setItem("awake-clock:broken", "{not json");
    const store = createStorage("broken", "fallback");
    expect(store.get()).toBe("fallback");
  });

  it("remove() deletes the key", () => {
    const store = createStorage("temp", "x");
    store.set("y");
    expect(store.remove()).toBe(true);
    expect(localStorage.getItem("awake-clock:temp")).toBeNull();
  });
});
