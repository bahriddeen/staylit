/**
 * Serialize clock settings (digital / flip) to and from URL query parameters,
 * so a chosen theme + format can be shared as a link. Values are validated on
 * parse (template against the view's list, format to 12/24) and missing params
 * fall back to the provided base.
 */

import type { ClockSettings, ClockView, TimeFormat } from "./settings";
import { isValidTemplate } from "./templates";

export function clockToParams(s: ClockSettings): URLSearchParams {
  return new URLSearchParams({
    template: s.template,
    format: s.format,
    sec: s.seconds ? "1" : "0",
    dy: s.dayAndYear ? "1" : "0",
  });
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

export function clockFromParams(
  view: ClockView,
  base: ClockSettings,
  params: URLSearchParams,
): ClockSettings {
  const template = params.get("template");
  const format = params.get("format");
  return {
    template:
      template && isValidTemplate(view, template) ? template : base.template,
    format:
      format === "12" || format === "24" ? (format as TimeFormat) : base.format,
    seconds: boolParam(params, "sec", base.seconds),
    dayAndYear: boolParam(params, "dy", base.dayAndYear),
  };
}

/** True if the query string carries any clock param (i.e. it's a shared link). */
export function hasClockParams(params: URLSearchParams): boolean {
  return ["template", "format", "sec", "dy"].some((k) => params.has(k));
}
