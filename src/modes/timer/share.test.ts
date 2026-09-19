import { describe, it, expect } from "vitest";
import { timerToParams, timerFromParams, hasTimerParams } from "./share";
import { DEFAULT_TIMER_SETTINGS } from "./settings";
import type { TimerSettings } from "./logic";

const make = (over: Partial<TimerSettings> = {}): TimerSettings => ({
  ...DEFAULT_TIMER_SETTINGS,
  ...over,
});

describe("timer share round-trip", () => {
  it("serializes and parses back an interval Pomodoro unchanged", () => {
    const settings = make({
      mode: "countdown",
      type: "interval",
      workTime: { hours: 0, minutes: 25, seconds: 0 },
      restTime: { hours: 0, minutes: 5, seconds: 0 },
      rounds: 4,
      longBreakEvery: 4,
      longBreakTime: { hours: 0, minutes: 15, seconds: 0 },
      alarmTone: "chime",
      alarmVolume: 0.6,
    });
    const params = timerToParams(settings);
    expect(timerFromParams(DEFAULT_TIMER_SETTINGS, params)).toEqual(settings);
  });

  it("round-trips an alarm config", () => {
    const settings = make({
      mode: "alarm",
      alarmTime: { hours: 6, minutes: 45 },
      alarmTone: "bell",
      alarmVolume: 1,
    });
    const params = timerToParams(settings);
    expect(timerFromParams(DEFAULT_TIMER_SETTINGS, params)).toEqual(settings);
  });

  it("keeps base values for params that are absent", () => {
    const base = make({ rounds: 7 });
    const parsed = timerFromParams(base, new URLSearchParams("m=stopwatch"));
    expect(parsed.mode).toBe("stopwatch");
    expect(parsed.rounds).toBe(7);
  });

  it("sanitizes out-of-range and garbage values", () => {
    const parsed = timerFromParams(
      DEFAULT_TIMER_SETTINGS,
      new URLSearchParams("m=bogus&rounds=999&vol=500&at=99:99&tone=nope"),
    );
    expect(parsed.mode).toBe(DEFAULT_TIMER_SETTINGS.mode); // invalid → base
    expect(parsed.rounds).toBe(99); // clamped
    expect(parsed.alarmVolume).toBe(1); // clamped
    expect(parsed.alarmTime).toEqual({ hours: 23, minutes: 59 }); // clamped
    expect(parsed.alarmTone).toBe(DEFAULT_TIMER_SETTINGS.alarmTone); // invalid → base
  });
});

describe("hasTimerParams", () => {
  it("detects shared links vs empty query", () => {
    expect(hasTimerParams(new URLSearchParams(""))).toBe(false);
    expect(hasTimerParams(new URLSearchParams("m=alarm"))).toBe(true);
    expect(hasTimerParams(new URLSearchParams("foo=bar"))).toBe(false);
  });
});
