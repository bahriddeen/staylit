/**
 * Timer mode logic: pure helpers (duration math, interval segment building)
 * plus a stateful TimerEngine driving Countdown (Simple / Interval / Bell),
 * Stopwatch, and Alarm (count down to a wall-clock time). All boundaries are
 * computed from absolute timestamps (Date.now()), the same pattern used by
 * Awake mode's countdown, so a delayed or throttled tick never causes drift —
 * the next tick simply catches up.
 */

import { playAlarm, type AlarmTone } from "./audio";

export interface HMS {
  hours: number;
  minutes: number;
  seconds: number;
}

/** Wall-clock time of day for the Alarm mode. */
export interface TimeOfDay {
  hours: number;
  minutes: number;
}

export type TimerMode = "countdown" | "stopwatch" | "alarm";
export type CountdownType = "simple" | "interval" | "bell";
export type TimerStatus = "idle" | "running" | "paused" | "finished";
export type Phase = "work" | "rest" | "longBreak" | null;

export interface TimerSettings {
  mode: TimerMode;
  type: CountdownType;
  simpleTime: HMS;
  workTime: HMS;
  restTime: HMS;
  rounds: number;
  /** Every Nth rest becomes a long break instead. 0 disables long breaks. */
  longBreakEvery: number;
  longBreakTime: HMS;
  totalTime: HMS;
  bellInterval: HMS;
  /** Wall-clock time the Alarm mode counts down to. */
  alarmTime: TimeOfDay;
  alarmSound: boolean;
  /** Which synthesized tone plays; used by countdown alarms and Alarm mode. */
  alarmTone: AlarmTone;
  /** Alarm loudness, 0–1. */
  alarmVolume: number;
  milliseconds: boolean;
}

export interface LapEntry {
  /** 1-based lap number. */
  index: number;
  /** Total elapsed stopwatch time at the moment this lap was recorded. */
  totalMs: number;
}

export interface TimerState {
  status: TimerStatus;
  /** Countdown: time left in the current segment. Stopwatch: elapsed time. */
  valueMs: number;
  phase: Phase;
  /** 1-based round number; 0 when not in interval type. */
  round: number;
  /** 0 when not in interval type. */
  totalRounds: number;
  /** Stopwatch only: recorded splits, oldest first. Empty otherwise. */
  laps: readonly LapEntry[];
}

export type TimerListener = (state: Readonly<TimerState>) => void;

const TICK_MS = 50;
const MIN_SEGMENT_MS = 1000;

function clampInt(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function clampHms(hms: HMS): HMS {
  return {
    hours: clampInt(hms.hours, 0, 23),
    minutes: clampInt(hms.minutes, 0, 59),
    seconds: clampInt(hms.seconds, 0, 59),
  };
}

export function clampRounds(rounds: number): number {
  return clampInt(rounds, 1, 99);
}

/** 0 disables long breaks; 1-99 sets how often one replaces a normal rest. */
export function clampLongBreakEvery(every: number): number {
  return clampInt(every, 0, 99);
}

export function hmsToMs(hms: HMS): number {
  return hms.hours * 3_600_000 + hms.minutes * 60_000 + hms.seconds * 1_000;
}

export function clampTimeOfDay(time: TimeOfDay): TimeOfDay {
  return {
    hours: clampInt(time.hours, 0, 23),
    minutes: clampInt(time.minutes, 0, 59),
  };
}

/**
 * Absolute timestamp of the next occurrence of `time` (a wall-clock HH:MM) at
 * or after `now`. If today's occurrence has already passed, rolls to tomorrow.
 */
export function nextAlarmTarget(now: number, time: TimeOfDay): number {
  const { hours, minutes } = clampTimeOfDay(time);
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  let ts = target.getTime();
  if (ts <= now) ts += 86_400_000;
  return ts;
}

interface Segment {
  phase: Phase;
  ms: number;
}

/**
 * Work/rest segments for the Interval type: work(1), rest(1), work(2), ...
 * with no trailing rest after the final round. Each segment is floored at
 * MIN_SEGMENT_MS so a 0-duration field can't produce a degenerate tight loop.
 * Every `longBreakEvery`th rest is a long break instead (Pomodoro-style);
 * 0 (the default for existing callers) disables long breaks entirely.
 */
export function buildIntervalSegments(
  workMs: number,
  restMs: number,
  rounds: number,
  longBreakMs = 0,
  longBreakEvery = 0,
): Segment[] {
  const segments: Segment[] = [];
  const work = Math.max(MIN_SEGMENT_MS, workMs);
  const rest = Math.max(MIN_SEGMENT_MS, restMs);
  const longBreak = Math.max(MIN_SEGMENT_MS, longBreakMs);
  for (let round = 1; round <= rounds; round++) {
    segments.push({ phase: "work", ms: work });
    if (round < rounds) {
      const isLongBreak = longBreakEvery > 0 && round % longBreakEvery === 0;
      segments.push({
        phase: isLongBreak ? "longBreak" : "rest",
        ms: isLongBreak ? longBreak : rest,
      });
    }
  }
  return segments;
}

/** The segment list a countdown session runs through, for any Type. */
function buildSegments(settings: TimerSettings): Segment[] {
  if (settings.type === "interval") {
    return buildIntervalSegments(
      hmsToMs(settings.workTime),
      hmsToMs(settings.restTime),
      clampRounds(settings.rounds),
      hmsToMs(settings.longBreakTime),
      clampLongBreakEvery(settings.longBreakEvery),
    );
  }
  const ms =
    settings.type === "bell"
      ? hmsToMs(settings.totalTime)
      : hmsToMs(settings.simpleTime);
  return [{ phase: null, ms }];
}

/** The value to display before a countdown has ever been started. */
export function idleValueMs(settings: TimerSettings): number {
  if (settings.mode === "stopwatch") return 0;
  return buildSegments(settings)[0]?.ms ?? 0;
}

export class TimerEngine {
  private settings: TimerSettings;
  private status: TimerStatus = "idle";
  private readonly listeners = new Set<TimerListener>();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  private segments: Segment[] = [];
  private segmentIndex = 0;
  private segmentEnd = 0;
  private segmentPausedRemaining = 0;

  private nextBellAt = Infinity;
  private pausedAt = 0;

  private stopwatchStart = 0;
  private stopwatchElapsedFrozen = 0;
  private laps: LapEntry[] = [];

  /** Absolute timestamp the Alarm mode counts down to (0 when not armed). */
  private alarmTarget = 0;

  constructor(initialSettings: TimerSettings) {
    this.settings = initialSettings;
  }

  private ring(): void {
    playAlarm(this.settings.alarmTone, this.settings.alarmVolume);
  }

  /** Update settings. Only affects display immediately while idle. */
  configure(settings: TimerSettings): void {
    this.settings = settings;
    if (this.status === "idle") this.emit();
  }

  getState(): Readonly<TimerState> {
    const now = Date.now();
    const core = this.computeCore(now);
    return { ...core, laps: this.laps };
  }

  private computeCore(now: number): Omit<TimerState, "laps"> {
    if (this.settings.mode === "stopwatch") {
      const valueMs =
        this.status === "running"
          ? now - this.stopwatchStart
          : this.stopwatchElapsedFrozen;
      return {
        status: this.status,
        valueMs,
        phase: null,
        round: 0,
        totalRounds: 0,
      };
    }

    if (this.settings.mode === "alarm") {
      // Idle previews time until the next occurrence; running counts down to
      // the armed target. Finished lands at zero. Alarm has no paused state.
      const target =
        this.status === "running"
          ? this.alarmTarget
          : nextAlarmTarget(now, this.settings.alarmTime);
      return {
        status: this.status,
        valueMs: this.status === "finished" ? 0 : Math.max(0, target - now),
        phase: null,
        round: 0,
        totalRounds: 0,
      };
    }

    if (this.status === "idle") {
      const isInterval = this.settings.type === "interval";
      return {
        status: "idle",
        valueMs: idleValueMs(this.settings),
        phase: isInterval ? "work" : null,
        round: isInterval ? 1 : 0,
        totalRounds: isInterval ? clampRounds(this.settings.rounds) : 0,
      };
    }

    if (this.status === "finished") {
      const isInterval = this.settings.type === "interval";
      return {
        status: "finished",
        valueMs: 0,
        phase: null,
        round: 0,
        totalRounds: isInterval ? clampRounds(this.settings.rounds) : 0,
      };
    }

    const seg = this.segments[this.segmentIndex] ?? null;
    const valueMs =
      this.status === "paused"
        ? this.segmentPausedRemaining
        : Math.max(0, this.segmentEnd - now);
    const { round, totalRounds } = this.roundInfo();
    return {
      status: this.status,
      valueMs,
      phase: seg?.phase ?? null,
      round,
      totalRounds,
    };
  }

  /** Stopwatch only: record a split at the current elapsed time. */
  split(): void {
    if (this.settings.mode !== "stopwatch" || this.status !== "running") return;
    const totalMs = Date.now() - this.stopwatchStart;
    this.laps = [...this.laps, { index: this.laps.length + 1, totalMs }];
    this.emit();
  }

  onChange(listener: TimerListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  start(): void {
    if (this.status === "running") return;
    const now = Date.now();
    if (this.status === "paused") {
      this.resumeFromPause(now);
    } else {
      this.initSession(now);
    }
    this.status = "running";
    this.scheduleTick();
    this.emit();
  }

  pause(): void {
    if (this.status !== "running") return;
    const now = Date.now();
    if (this.settings.mode === "stopwatch") {
      this.stopwatchElapsedFrozen = now - this.stopwatchStart;
    } else {
      this.segmentPausedRemaining = Math.max(0, this.segmentEnd - now);
    }
    this.pausedAt = now;
    this.status = "paused";
    this.clearTick();
    this.emit();
  }

  reset(): void {
    this.clearTick();
    this.status = "idle";
    this.segments = [];
    this.segmentIndex = 0;
    this.segmentPausedRemaining = 0;
    this.nextBellAt = Infinity;
    this.stopwatchStart = 0;
    this.stopwatchElapsedFrozen = 0;
    this.alarmTarget = 0;
    this.laps = [];
    this.emit();
  }

  destroy(): void {
    this.clearTick();
    this.listeners.clear();
  }

  private initSession(now: number): void {
    if (this.settings.mode === "stopwatch") {
      this.stopwatchStart = now;
      this.stopwatchElapsedFrozen = 0;
      return;
    }
    if (this.settings.mode === "alarm") {
      this.alarmTarget = nextAlarmTarget(now, this.settings.alarmTime);
      return;
    }
    this.segments = buildSegments(this.settings);
    this.segmentIndex = 0;
    this.segmentEnd = now + (this.segments[0]?.ms ?? 0);
    if (this.settings.type === "bell") {
      const bellMs = hmsToMs(this.settings.bellInterval);
      this.nextBellAt = bellMs > 0 ? now + bellMs : Infinity;
    } else {
      this.nextBellAt = Infinity;
    }
  }

  private resumeFromPause(now: number): void {
    const delta = now - this.pausedAt;
    if (this.settings.mode === "stopwatch") {
      this.stopwatchStart = now - this.stopwatchElapsedFrozen;
    } else {
      this.segmentEnd = now + this.segmentPausedRemaining;
      if (this.nextBellAt !== Infinity) this.nextBellAt += delta;
    }
  }

  private roundInfo(): { round: number; totalRounds: number } {
    if (this.settings.type !== "interval") return { round: 0, totalRounds: 0 };
    return {
      round: Math.floor(this.segmentIndex / 2) + 1,
      totalRounds: clampRounds(this.settings.rounds),
    };
  }

  private scheduleTick(): void {
    this.clearTick();
    this.intervalId = setInterval(() => this.tick(), TICK_MS);
  }

  private clearTick(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick(): void {
    const now = Date.now();

    if (this.settings.mode === "stopwatch") {
      this.emit();
      return;
    }

    if (this.settings.mode === "alarm") {
      if (now >= this.alarmTarget) {
        this.status = "finished";
        this.clearTick();
        this.ring();
      }
      this.emit();
      return;
    }

    if (this.settings.type === "bell" && now >= this.nextBellAt) {
      if (this.settings.alarmSound) this.ring();
      const bellMs = hmsToMs(this.settings.bellInterval);
      this.nextBellAt = bellMs > 0 ? this.nextBellAt + bellMs : Infinity;
    }

    if (now >= this.segmentEnd) {
      this.advanceSegment(now);
      return;
    }
    this.emit();
  }

  private advanceSegment(now: number): void {
    const finishedPhase = this.segments[this.segmentIndex]?.phase ?? null;
    this.segmentIndex += 1;

    if (this.segmentIndex >= this.segments.length) {
      this.status = "finished";
      this.clearTick();
      if (this.settings.alarmSound) this.ring();
      this.emit();
      return;
    }

    if (finishedPhase !== null && this.settings.alarmSound) this.ring();
    const next = this.segments[this.segmentIndex]!;
    this.segmentEnd = now + next.ms;
    this.emit();
  }

  private emit(): void {
    const state = this.getState();
    for (const listener of this.listeners) listener(state);
  }
}
