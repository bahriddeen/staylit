/**
 * Serialize timer/alarm settings to and from URL query parameters, so a
 * configured Pomodoro or alarm can be shared as a link. Every value is
 * sanitized on parse (reusing the engine's clamps) and unknown/missing params
 * fall back to the provided base, so a hand-edited or partial URL can't produce
 * an invalid configuration.
 */

import {
  clampHms,
  clampRounds,
  clampLongBreakEvery,
  clampTimeOfDay,
  hmsToMs,
  type HMS,
  type TimerMode,
  type CountdownType,
  type TimerSettings,
} from "./logic";
import { ALARM_TONES, clampVolume, type AlarmTone } from "./audio";

const MODES: TimerMode[] = ["countdown", "stopwatch", "alarm"];
const TYPES: CountdownType[] = ["simple", "interval", "bell"];

function hmsToSec(hms: HMS): number {
  return Math.round(hmsToMs(hms) / 1000);
}

function secToHms(totalSec: number): HMS {
  const s = Math.max(0, Math.trunc(totalSec));
  return clampHms({
    hours: Math.floor(s / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  });
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Serialize timer settings into query params (all fields, for a clean round trip). */
export function timerToParams(s: TimerSettings): URLSearchParams {
  return new URLSearchParams({
    m: s.mode,
    t: s.type,
    set: String(hmsToSec(s.simpleTime)),
    work: String(hmsToSec(s.workTime)),
    rest: String(hmsToSec(s.restTime)),
    rounds: String(s.rounds),
    lbEvery: String(s.longBreakEvery),
    lb: String(hmsToSec(s.longBreakTime)),
    total: String(hmsToSec(s.totalTime)),
    bell: String(hmsToSec(s.bellInterval)),
    at: `${pad2(s.alarmTime.hours)}:${pad2(s.alarmTime.minutes)}`,
    snd: s.alarmSound ? "1" : "0",
    tone: s.alarmTone,
    vol: String(Math.round(clampVolume(s.alarmVolume) * 100)),
    ms: s.milliseconds ? "1" : "0",
  });
}

function intParam(
  params: URLSearchParams,
  key: string,
  fallback: number,
): number {
  const raw = params.get(key);
  if (raw === null) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isNaN(n) ? fallback : n;
}

function boolParam(
  params: URLSearchParams,
  key: string,
  fallback: boolean,
): boolean {
  const raw = params.get(key);
  if (raw === null) return fallback;
  return raw === "1" || raw === "true";
}

function parseAt(
  raw: string | null,
  fallback: { hours: number; minutes: number },
) {
  if (!raw) return fallback;
  const [h, m] = raw.split(":");
  return clampTimeOfDay({
    hours: Number.parseInt(h ?? "", 10),
    minutes: Number.parseInt(m ?? "", 10),
  });
}

/** Apply query params on top of a base settings object, sanitizing every value. */
export function timerFromParams(
  base: TimerSettings,
  params: URLSearchParams,
): TimerSettings {
  const mode = params.get("m");
  const type = params.get("t");
  const tone = params.get("tone");
  return {
    mode: MODES.includes(mode as TimerMode) ? (mode as TimerMode) : base.mode,
    type: TYPES.includes(type as CountdownType)
      ? (type as CountdownType)
      : base.type,
    simpleTime: params.has("set")
      ? secToHms(intParam(params, "set", 0))
      : base.simpleTime,
    workTime: params.has("work")
      ? secToHms(intParam(params, "work", 0))
      : base.workTime,
    restTime: params.has("rest")
      ? secToHms(intParam(params, "rest", 0))
      : base.restTime,
    rounds: params.has("rounds")
      ? clampRounds(intParam(params, "rounds", base.rounds))
      : base.rounds,
    longBreakEvery: params.has("lbEvery")
      ? clampLongBreakEvery(intParam(params, "lbEvery", base.longBreakEvery))
      : base.longBreakEvery,
    longBreakTime: params.has("lb")
      ? secToHms(intParam(params, "lb", 0))
      : base.longBreakTime,
    totalTime: params.has("total")
      ? secToHms(intParam(params, "total", 0))
      : base.totalTime,
    bellInterval: params.has("bell")
      ? secToHms(intParam(params, "bell", 0))
      : base.bellInterval,
    alarmTime: parseAt(params.get("at"), base.alarmTime),
    alarmSound: boolParam(params, "snd", base.alarmSound),
    alarmTone: ALARM_TONES.includes(tone as AlarmTone)
      ? (tone as AlarmTone)
      : base.alarmTone,
    alarmVolume: params.has("vol")
      ? clampVolume(intParam(params, "vol", 70) / 100)
      : base.alarmVolume,
    milliseconds: boolParam(params, "ms", base.milliseconds),
  };
}

/** True if the query string carries any timer param (i.e. it's a shared link). */
export function hasTimerParams(params: URLSearchParams): boolean {
  return ["m", "t", "set", "work", "total", "at", "tone"].some((k) =>
    params.has(k),
  );
}
