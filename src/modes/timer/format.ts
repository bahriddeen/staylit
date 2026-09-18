/**
 * Timer display formatting. Countdown reuses Awake mode's HH:MM:SS formatter
 * (rounds up so it reads cleanly as it ticks down). Stopwatch needs its own
 * floor-based formatter, since elapsed time starts at zero and counts up, plus
 * an optional full-millisecond suffix when the Milliseconds setting is on.
 */

export { formatHMS } from "../awake/durations";

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function pad3(n: number): string {
  return n.toString().padStart(3, "0");
}

function hmsBase(totalMs: number): string {
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

export function formatStopwatch(ms: number, withMs: boolean): string {
  const totalMs = Math.max(0, ms);
  const base = hmsBase(totalMs);
  if (!withMs) return base;
  return `${base}.${pad3(totalMs % 1000)}`;
}

export interface StopwatchParts {
  /** "HH:MM:SS." plus the first millisecond digit, e.g. "00:00:17.5". */
  main: string;
  /** The remaining two millisecond digits, meant to render smaller. */
  fraction: string;
}

/** Split the elapsed time so the last two millisecond digits can render
 * smaller than the rest, matching a classic stopwatch display. */
export function formatStopwatchParts(ms: number): StopwatchParts {
  const totalMs = Math.max(0, ms);
  const msStr = pad3(totalMs % 1000);
  return {
    main: `${hmsBase(totalMs)}.${msStr[0]}`,
    fraction: msStr.slice(1),
  };
}
