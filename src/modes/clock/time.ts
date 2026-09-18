/**
 * Pure time formatting for the clock views. Given a Date and the format, returns
 * zero-padded digit strings and an AM/PM label. No DOM, no globals — easy to
 * unit-test and cheap to call every tick.
 */

import type { TimeFormat } from "./settings";

export interface TimeParts {
  /** Two-character hour string ("00"–"23" or "01"–"12"). */
  hh: string;
  mm: string;
  ss: string;
  /** "" in 24H mode, "AM" / "PM" in 12H mode. */
  ampm: "" | "AM" | "PM";
}

/** Placeholder shown before the first tick to avoid layout shift. */
export const PLACEHOLDER: TimeParts = {
  hh: "--",
  mm: "--",
  ss: "--",
  ampm: "",
};

const pad2 = (n: number): string => n.toString().padStart(2, "0");

export function toParts(date: Date, format: TimeFormat): TimeParts {
  const h24 = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  if (format === "12") {
    const ampm: "AM" | "PM" = h24 < 12 ? "AM" : "PM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return { hh: pad2(h12), mm: pad2(minutes), ss: pad2(seconds), ampm };
  }
  return { hh: pad2(h24), mm: pad2(minutes), ss: pad2(seconds), ampm: "" };
}

/** Human date line, e.g. "Wednesday, September 16, 2026". */
export function dateLine(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * Colon opacity for a blinking colon at time `nowMs`: on for the first half of
 * each second, dimmed for the second half. Callers gate this on
 * prefers-reduced-motion.
 */
export function colonOn(nowMs: number): boolean {
  return nowMs % 1000 < 500;
}
