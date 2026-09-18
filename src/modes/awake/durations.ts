/**
 * Duration selection logic for Awake mode. Pure and framework-free so it can be
 * unit-tested without timers or the DOM.
 */

export type DurationPreset = "always" | "10m" | "30m" | "1h" | "2h" | "custom";

export interface DurationSelection {
  preset: DurationPreset;
  /** Custom hours (0–23), only meaningful when preset === "custom". */
  hours: number;
  /** Custom minutes (0–59), only meaningful when preset === "custom". */
  minutes: number;
}

export const DEFAULT_SELECTION: DurationSelection = {
  preset: "always",
  hours: 0,
  minutes: 30,
};

/** Ordered presets for the segmented control. */
export const PRESETS: DurationPreset[] = [
  "always",
  "10m",
  "30m",
  "1h",
  "2h",
  "custom",
];

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const FIXED_MS: Record<Exclude<DurationPreset, "always" | "custom">, number> = {
  "10m": 10 * MINUTE,
  "30m": 30 * MINUTE,
  "1h": HOUR,
  "2h": 2 * HOUR,
};

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/** Normalize raw custom input into valid ranges. */
export function clampCustom(
  hours: number,
  minutes: number,
): {
  hours: number;
  minutes: number;
} {
  return { hours: clamp(hours, 0, 23), minutes: clamp(minutes, 0, 59) };
}

/**
 * Convert a selection to a duration in milliseconds.
 * Returns null for "always on" (no timer) and for custom durations of zero.
 */
export function selectionToMs(selection: DurationSelection): number | null {
  if (selection.preset === "always") return null;
  if (selection.preset === "custom") {
    const { hours, minutes } = clampCustom(selection.hours, selection.minutes);
    const ms = hours * HOUR + minutes * MINUTE;
    return ms > 0 ? ms : null;
  }
  return FIXED_MS[selection.preset];
}

/** Whether this selection runs a finite countdown. */
export function isTimed(selection: DurationSelection): boolean {
  return selectionToMs(selection) !== null;
}

/** Milliseconds remaining until an absolute end timestamp (never negative). */
export function remainingMs(endTimestamp: number, now: number): number {
  return Math.max(0, endTimestamp - now);
}

/**
 * Format milliseconds as HH:MM:SS, rounding up so a countdown shows the second
 * the user is currently in (e.g. 999ms left still reads 00:00:01, not :00).
 */
export function formatHMS(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number): string => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
