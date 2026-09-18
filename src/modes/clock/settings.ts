/**
 * Clock settings, persisted per view (digital / flip). Each view keeps its own
 * format / seconds / date / template choice so switching views restores what
 * the user last had.
 */

import { createStorage } from "../../core/storage";

export type ClockView = "digital" | "flip";
export type TimeFormat = "24" | "12";

export interface ClockSettings {
  format: TimeFormat;
  seconds: boolean;
  dayAndYear: boolean;
  /** Template id, validated against the view's template list on read. */
  template: string;
}

export const DEFAULT_SETTINGS: Record<ClockView, ClockSettings> = {
  digital: {
    format: "24",
    seconds: true,
    dayAndYear: false,
    template: "digital",
  },
  flip: {
    format: "24",
    seconds: true,
    dayAndYear: false,
    template: "dark",
  },
};

function store(view: ClockView) {
  return createStorage<ClockSettings>(
    `clock.settings.${view}`,
    DEFAULT_SETTINGS[view],
  );
}

export function loadSettings(view: ClockView): ClockSettings {
  return { ...DEFAULT_SETTINGS[view], ...store(view).get() };
}

export function saveSettings(view: ClockView, settings: ClockSettings): void {
  store(view).set(settings);
}

/** Per-view display scale (mobile pinch-zoom), clamped 0.5–3. */
export function loadScale(view: ClockView): number {
  const value = createStorage<number>(`clock.scale.${view}`, 1).get();
  return clampScale(value);
}

export function saveScale(view: ClockView, scale: number): void {
  createStorage<number>(`clock.scale.${view}`, 1).set(clampScale(scale));
}

export function clampScale(scale: number): number {
  if (Number.isNaN(scale)) return 1;
  return Math.min(3, Math.max(0.5, scale));
}
