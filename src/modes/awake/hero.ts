/**
 * The Awake-mode hero card view. Builds the DOM and exposes handles the
 * controller wires behavior to. Holds no timer/wake-lock logic itself.
 */

import { t } from "../../core/i18n";
import { createToggle, type ToggleController } from "../../ui/toggle";
import { createSegmented, type SegmentedController } from "../../ui/segmented";
import { createNumberField } from "../../ui/numberField";
import {
  PRESETS,
  type DurationPreset,
  type DurationSelection,
} from "./durations";

export interface HeroHandlers {
  onPresetChange(preset: DurationPreset): void;
  onToggle(checked: boolean): void;
  onCustomChange(hours: number, minutes: number): void;
}

export interface HeroView {
  element: HTMLElement;
  segmented: SegmentedController<DurationPreset>;
  customFields: HTMLElement;
  hoursInput: HTMLInputElement;
  minutesInput: HTMLInputElement;
  toggle: ToggleController;
  statusEl: HTMLElement;
}

const PRESET_LABEL: Record<DurationPreset, string> = {
  always: "awake.duration.always",
  "10m": "awake.duration.m10",
  "30m": "awake.duration.m30",
  "1h": "awake.duration.h1",
  "2h": "awake.duration.h2",
  custom: "awake.duration.custom",
};

export function createHero(
  selection: DurationSelection,
  handlers: HeroHandlers,
): HeroView {
  const section = document.createElement("section");
  section.className = "hero card";
  section.setAttribute("aria-labelledby", "awake-title");

  // Heading + subtitle
  const h1 = document.createElement("h1");
  h1.id = "awake-title";
  h1.className = "hero__title";
  h1.textContent = t("awake.hero.title");

  const subtitle = document.createElement("p");
  subtitle.className = "hero__subtitle";
  subtitle.textContent = t("awake.hero.subtitle");

  // Duration row
  const durationRow = document.createElement("div");
  durationRow.className = "hero__row";

  const durationLabel = document.createElement("span");
  durationLabel.className = "hero__row-label";
  durationLabel.textContent = t("awake.hero.durationLabel");

  const segmented = createSegmented<DurationPreset>({
    label: t("awake.hero.durationLabel"),
    value: selection.preset,
    items: PRESETS.map((p) => ({ value: p, label: t(PRESET_LABEL[p]) })),
    onChange: handlers.onPresetChange,
  });

  durationRow.append(durationLabel, segmented.element);

  // Custom fields (hidden unless preset === custom)
  const customFields = document.createElement("div");
  customFields.className = "hero__custom";
  customFields.hidden = selection.preset !== "custom";

  const hours = createNumberField({
    labelKey: "awake.duration.hoursLabel",
    suffixKey: "awake.duration.hoursSuffix",
    min: 0,
    max: 23,
    value: selection.hours,
  });
  const minutes = createNumberField({
    labelKey: "awake.duration.minutesLabel",
    suffixKey: "awake.duration.minutesSuffix",
    min: 0,
    max: 59,
    value: selection.minutes,
  });
  customFields.append(hours.wrap, minutes.wrap);

  const emitCustom = (): void => {
    handlers.onCustomChange(
      Number.parseInt(hours.input.value, 10),
      Number.parseInt(minutes.input.value, 10),
    );
  };
  hours.input.addEventListener("input", emitCustom);
  minutes.input.addEventListener("input", emitCustom);

  // Keep Awake row (large toggle)
  const toggleRow = document.createElement("div");
  toggleRow.className = "hero__row hero__row--toggle";

  const toggle = createToggle({
    label: t("awake.hero.keepAwakeLabel"),
    size: "lg",
    tone: "success",
    id: "keep-awake",
    onChange: handlers.onToggle,
  });
  toggleRow.append(toggle.element);

  // Status area (rendered by the controller)
  const statusEl = document.createElement("div");
  statusEl.className = "hero__status";
  statusEl.setAttribute("role", "status");
  statusEl.setAttribute("aria-live", "polite");

  // Inline notice
  const notice = document.createElement("p");
  notice.className = "hero__notice";
  const noticeText = document.createElement("span");
  noticeText.textContent = t("awake.notice");
  notice.append(noticeText);

  section.append(
    h1,
    subtitle,
    durationRow,
    customFields,
    toggleRow,
    statusEl,
    notice,
  );

  return {
    element: section,
    segmented,
    customFields,
    hoursInput: hours.input,
    minutesInput: minutes.input,
    toggle,
    statusEl,
  };
}
