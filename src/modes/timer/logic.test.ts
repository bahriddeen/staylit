import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  hmsToMs,
  clampHms,
  clampRounds,
  clampTimeOfDay,
  nextAlarmTarget,
  buildIntervalSegments,
  idleValueMs,
  TimerEngine,
  type TimerSettings,
} from "./logic";
import { DEFAULT_TIMER_SETTINGS } from "./settings";

vi.mock("./audio", () => ({ playAlarm: vi.fn(), ALARM_TONES: ["beep"] }));
import { playAlarm } from "./audio";

const settings = (over: Partial<TimerSettings> = {}): TimerSettings => ({
  ...DEFAULT_TIMER_SETTINGS,
  ...over,
});

describe("hmsToMs / clampHms / clampRounds", () => {
  it("converts hours/minutes/seconds to milliseconds", () => {
    expect(hmsToMs({ hours: 1, minutes: 2, seconds: 3 })).toBe(3_723_000);
    expect(hmsToMs({ hours: 0, minutes: 25, seconds: 0 })).toBe(1_500_000);
  });

  it("clamps hms fields to valid ranges", () => {
    expect(clampHms({ hours: -1, minutes: 99, seconds: -5 })).toEqual({
      hours: 0,
      minutes: 59,
      seconds: 0,
    });
    expect(clampHms({ hours: 30, minutes: 5, seconds: 70 })).toEqual({
      hours: 23,
      minutes: 5,
      seconds: 59,
    });
  });

  it("clamps rounds to 1-99", () => {
    expect(clampRounds(0)).toBe(1);
    expect(clampRounds(150)).toBe(99);
    expect(clampRounds(5)).toBe(5);
  });
});

describe("buildIntervalSegments", () => {
  it("alternates work/rest with no trailing rest", () => {
    const segs = buildIntervalSegments(60_000, 15_000, 3);
    expect(segs.map((s) => s.phase)).toEqual([
      "work",
      "rest",
      "work",
      "rest",
      "work",
    ]);
  });

  it("a single round is just one work segment", () => {
    const segs = buildIntervalSegments(60_000, 15_000, 1);
    expect(segs).toEqual([{ phase: "work", ms: 60_000 }]);
  });

  it("floors zero-duration segments to avoid a degenerate loop", () => {
    const segs = buildIntervalSegments(0, 0, 2);
    for (const s of segs) expect(s.ms).toBeGreaterThanOrEqual(1000);
  });

  it("swaps in a long break every Nth rest when configured", () => {
    const segs = buildIntervalSegments(60_000, 15_000, 5, 900_000, 2);
    expect(segs.map((s) => s.phase)).toEqual([
      "work",
      "rest",
      "work",
      "longBreak",
      "work",
      "rest",
      "work",
      "longBreak",
      "work",
    ]);
    expect(segs[3]).toEqual({ phase: "longBreak", ms: 900_000 });
  });

  it("never inserts a long break when longBreakEvery is 0", () => {
    const segs = buildIntervalSegments(60_000, 15_000, 4, 900_000, 0);
    expect(segs.map((s) => s.phase)).toEqual([
      "work",
      "rest",
      "work",
      "rest",
      "work",
      "rest",
      "work",
    ]);
  });
});

describe("idleValueMs", () => {
  it("is 0 for stopwatch", () => {
    expect(idleValueMs(settings({ mode: "stopwatch" }))).toBe(0);
  });

  it("shows the configured simple duration", () => {
    expect(
      idleValueMs(
        settings({
          type: "simple",
          simpleTime: { hours: 0, minutes: 10, seconds: 0 },
        }),
      ),
    ).toBe(600_000);
  });

  it("shows the first work segment for interval", () => {
    expect(
      idleValueMs(
        settings({
          type: "interval",
          workTime: { hours: 0, minutes: 20, seconds: 0 },
        }),
      ),
    ).toBe(1_200_000);
  });
});

describe("TimerEngine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    vi.mocked(playAlarm).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("idle state shows the configured duration without starting", () => {
    const engine = new TimerEngine(settings());
    expect(engine.getState()).toMatchObject({
      status: "idle",
      valueMs: 1_500_000,
    });
    engine.destroy();
  });

  it("simple countdown counts down and finishes with a beep", async () => {
    const engine = new TimerEngine(
      settings({
        type: "simple",
        simpleTime: { hours: 0, minutes: 0, seconds: 2 },
      }),
    );
    engine.start();
    expect(engine.getState().status).toBe("running");

    await vi.advanceTimersByTimeAsync(1000);
    expect(engine.getState().valueMs).toBeLessThanOrEqual(1000);

    await vi.advanceTimersByTimeAsync(1100);
    const finalState = engine.getState();
    expect(finalState.status).toBe("finished");
    expect(finalState.valueMs).toBe(0);
    expect(playAlarm).toHaveBeenCalled();
    engine.destroy();
  });

  it("pause freezes the remaining time and resume continues from there", async () => {
    const engine = new TimerEngine(
      settings({
        type: "simple",
        simpleTime: { hours: 0, minutes: 0, seconds: 10 },
      }),
    );
    engine.start();
    await vi.advanceTimersByTimeAsync(2000);
    engine.pause();
    const pausedRemaining = engine.getState().valueMs;
    expect(engine.getState().status).toBe("paused");

    // Time passes while paused; remaining must not change.
    await vi.advanceTimersByTimeAsync(3000);
    expect(engine.getState().valueMs).toBe(pausedRemaining);

    engine.start();
    expect(engine.getState().status).toBe("running");
    await vi.advanceTimersByTimeAsync(500);
    expect(engine.getState().valueMs).toBeLessThan(pausedRemaining);
    engine.destroy();
  });

  it("reset returns to idle with the configured duration", async () => {
    const engine = new TimerEngine(
      settings({
        type: "simple",
        simpleTime: { hours: 0, minutes: 0, seconds: 5 },
      }),
    );
    engine.start();
    await vi.advanceTimersByTimeAsync(1000);
    engine.reset();
    expect(engine.getState()).toMatchObject({ status: "idle", valueMs: 5000 });
    engine.destroy();
  });

  it("interval type cycles work -> rest -> work with round numbers", async () => {
    const engine = new TimerEngine(
      settings({
        type: "interval",
        workTime: { hours: 0, minutes: 0, seconds: 1 },
        restTime: { hours: 0, minutes: 0, seconds: 1 },
        rounds: 2,
      }),
    );
    engine.start();
    expect(engine.getState()).toMatchObject({
      phase: "work",
      round: 1,
      totalRounds: 2,
    });

    await vi.advanceTimersByTimeAsync(1100);
    expect(engine.getState()).toMatchObject({ phase: "rest", round: 1 });

    await vi.advanceTimersByTimeAsync(1100);
    expect(engine.getState()).toMatchObject({ phase: "work", round: 2 });

    await vi.advanceTimersByTimeAsync(1100);
    expect(engine.getState().status).toBe("finished");
    engine.destroy();
  });

  it("interval type takes a long break every Nth round", async () => {
    const engine = new TimerEngine(
      settings({
        type: "interval",
        workTime: { hours: 0, minutes: 0, seconds: 1 },
        restTime: { hours: 0, minutes: 0, seconds: 1 },
        longBreakTime: { hours: 0, minutes: 0, seconds: 1 },
        longBreakEvery: 2,
        rounds: 3,
      }),
    );
    engine.start();
    expect(engine.getState()).toMatchObject({ phase: "work", round: 1 });

    await vi.advanceTimersByTimeAsync(1100);
    expect(engine.getState()).toMatchObject({ phase: "rest", round: 1 });

    await vi.advanceTimersByTimeAsync(1100);
    expect(engine.getState()).toMatchObject({ phase: "work", round: 2 });

    await vi.advanceTimersByTimeAsync(1100);
    expect(engine.getState()).toMatchObject({ phase: "longBreak", round: 2 });

    await vi.advanceTimersByTimeAsync(1100);
    expect(engine.getState()).toMatchObject({ phase: "work", round: 3 });
    engine.destroy();
  });

  it("stopwatch counts up and pause/resume preserves elapsed time", async () => {
    const engine = new TimerEngine(settings({ mode: "stopwatch" }));
    expect(engine.getState()).toMatchObject({ status: "idle", valueMs: 0 });
    engine.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(engine.getState().valueMs).toBeGreaterThanOrEqual(1000);

    engine.pause();
    const frozen = engine.getState().valueMs;
    await vi.advanceTimersByTimeAsync(2000);
    expect(engine.getState().valueMs).toBe(frozen);

    engine.start();
    await vi.advanceTimersByTimeAsync(500);
    expect(engine.getState().valueMs).toBeGreaterThan(frozen);
    engine.destroy();
  });

  it("split records laps only while running in stopwatch mode", async () => {
    const engine = new TimerEngine(settings({ mode: "stopwatch" }));

    // No-ops: idle, and countdown mode entirely.
    engine.split();
    expect(engine.getState().laps).toEqual([]);

    engine.start();
    await vi.advanceTimersByTimeAsync(1000);
    engine.split();
    await vi.advanceTimersByTimeAsync(1000);
    engine.split();

    const laps = engine.getState().laps;
    expect(laps).toHaveLength(2);
    expect(laps[0]!.index).toBe(1);
    expect(laps[1]!.index).toBe(2);
    expect(laps[1]!.totalMs).toBeGreaterThan(laps[0]!.totalMs);

    engine.pause();
    engine.split(); // paused: no-op
    expect(engine.getState().laps).toHaveLength(2);

    engine.reset();
    expect(engine.getState().laps).toEqual([]);
    engine.destroy();
  });

  it("countdown types never record laps", async () => {
    const engine = new TimerEngine(
      settings({
        type: "simple",
        simpleTime: { hours: 0, minutes: 0, seconds: 2 },
      }),
    );
    engine.start();
    engine.split();
    expect(engine.getState().laps).toEqual([]);
    engine.destroy();
  });

  it("bell type rings on the interval without stopping the countdown", async () => {
    const engine = new TimerEngine(
      settings({
        type: "bell",
        totalTime: { hours: 0, minutes: 0, seconds: 5 },
        bellInterval: { hours: 0, minutes: 0, seconds: 2 },
      }),
    );
    engine.start();
    await vi.advanceTimersByTimeAsync(2100);
    expect(playAlarm).toHaveBeenCalledTimes(1);
    expect(engine.getState().status).toBe("running");

    await vi.advanceTimersByTimeAsync(2000);
    expect(playAlarm).toHaveBeenCalledTimes(2);
    engine.destroy();
  });

  it("does not beep when alarmSound is off", async () => {
    const engine = new TimerEngine(
      settings({
        type: "simple",
        simpleTime: { hours: 0, minutes: 0, seconds: 1 },
        alarmSound: false,
      }),
    );
    engine.start();
    await vi.advanceTimersByTimeAsync(1100);
    expect(engine.getState().status).toBe("finished");
    expect(playAlarm).not.toHaveBeenCalled();
    engine.destroy();
  });

  it("alarm counts down to the target time and rings once", async () => {
    // System time is 0 (1970-01-01 00:00 local). Target 00:00:02 from now.
    const target = new Date(0);
    target.setSeconds(2, 0);
    const engine = new TimerEngine(
      settings({
        mode: "alarm",
        alarmTime: { hours: target.getHours(), minutes: target.getMinutes() },
      }),
    );
    // Idle preview shows time until the next occurrence (> 0).
    expect(engine.getState()).toMatchObject({ status: "idle" });
    expect(engine.getState().valueMs).toBeGreaterThan(0);

    engine.start();
    expect(engine.getState().status).toBe("running");

    // Not yet at the target minute boundary — still counting down.
    await vi.advanceTimersByTimeAsync(1000);
    expect(engine.getState().status).toBe("running");
    expect(playAlarm).not.toHaveBeenCalled();
    engine.destroy();
  });
});

describe("clampTimeOfDay / nextAlarmTarget", () => {
  it("clamps hours and minutes to valid ranges", () => {
    expect(clampTimeOfDay({ hours: 30, minutes: -5 })).toEqual({
      hours: 23,
      minutes: 0,
    });
  });

  it("returns today's occurrence when it is still in the future", () => {
    const now = new Date(2026, 0, 1, 6, 0, 0, 0).getTime();
    const target = nextAlarmTarget(now, { hours: 7, minutes: 0 });
    expect(new Date(target).getHours()).toBe(7);
    expect(target - now).toBe(3_600_000);
  });

  it("rolls to tomorrow when the time has already passed today", () => {
    const now = new Date(2026, 0, 1, 8, 0, 0, 0).getTime();
    const target = nextAlarmTarget(now, { hours: 7, minutes: 0 });
    // 23 hours until tomorrow 07:00.
    expect(target - now).toBe(23 * 3_600_000);
  });
});
