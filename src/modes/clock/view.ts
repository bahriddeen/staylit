/**
 * Common contract implemented by the Digital and Flip renderers so the
 * orchestrator can drive them uniformly with one shared ticker.
 */

import type { ClockSettings } from "./settings";
import type { TimeParts } from "./time";

export interface ClockRenderer {
  /** Root element to mount in the stage; fills it and carries the template. */
  readonly element: HTMLElement;
  /** Apply settings (template, format, seconds, date). May rebuild structure. */
  applySettings(settings: ClockSettings): void;
  /** Per-tick update. Must avoid layout-thrashing reads. */
  render(parts: TimeParts, nowMs: number, settings: ClockSettings): void;
  /** Tear down listeners/observers. */
  destroy(): void;
}
