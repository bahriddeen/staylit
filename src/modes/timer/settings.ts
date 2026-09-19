/**
 * Persisted Timer settings. Everything except the running state (mode, type,
 * configured durations, alarm/ms toggles) is remembered between visits.
 */

import { createStorage } from "../../core/storage";
import type { TimerSettings } from "./logic";

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  mode: "countdown",
  type: "simple",
  simpleTime: { hours: 0, minutes: 25, seconds: 0 },
  workTime: { hours: 0, minutes: 25, seconds: 0 },
  restTime: { hours: 0, minutes: 5, seconds: 0 },
  rounds: 5,
  longBreakEvery: 4,
  longBreakTime: { hours: 0, minutes: 15, seconds: 0 },
  totalTime: { hours: 0, minutes: 30, seconds: 0 },
  bellInterval: { hours: 0, minutes: 5, seconds: 0 },
  alarmTime: { hours: 7, minutes: 0 },
  alarmSound: true,
  alarmTone: "beep",
  alarmVolume: 0.7,
  milliseconds: false,
};

const store = createStorage<TimerSettings>(
  "timer.settings",
  DEFAULT_TIMER_SETTINGS,
);

export function loadTimerSettings(): TimerSettings {
  return { ...DEFAULT_TIMER_SETTINGS, ...store.get() };
}

export function saveTimerSettings(settings: TimerSettings): void {
  store.set(settings);
}
