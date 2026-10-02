/**
 * Timer settings panel: a persistent, non-blocking side panel (no backdrop),
 * matching the reference layout where the timer's Play/Pause/Reset controls
 * stay fully clickable while the panel is open. A blocking modal drawer here
 * would swallow clicks meant for those controls, which is exactly the bug this
 * panel avoids.
 *
 * Layout: a large "Settings" title, then label-left/control-right rows for
 * Mode, Type (icon-only segmented), Rounds, and the two toggles. H:M:S
 * duration groups (Set Time, Work/Rest Time, Total Time, Interval Bell) are
 * their own section: a bold label on its own line, then a full-width row of
 * three equally-sized boxed number fields underneath — mirroring the
 * reference site's settings panel.
 */

import { t } from "../../core/i18n";
import { icons } from "../../ui/icons";
import { createSegmented } from "../../ui/segmented";
import { createToggle } from "../../ui/toggle";
import { createNumberField } from "../../ui/numberField";
import {
  clampHms,
  clampLongBreakEvery,
  clampRounds,
  clampTimeOfDay,
  type CountdownType,
  type HMS,
  type TimeOfDay,
  type TimerMode,
  type TimerSettings,
} from "./logic";
import { playAlarm, clampVolume, ALARM_TONES, type AlarmTone } from "./audio";

export interface TimerSettingsPanel {
  readonly element: HTMLElement;
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  destroy(): void;
}

function row(labelText: string, control: HTMLElement): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "timer-row";
  const label = document.createElement("span");
  label.className = "timer-row__label";
  label.textContent = labelText;
  wrap.append(label, control);
  return wrap;
}

function hmsSection(
  labelKey: string,
  value: HMS,
  onChange: (hms: HMS) => void,
): HTMLElement {
  const section = document.createElement("div");
  section.className = "timer-hms-section";
  const label = document.createElement("span");
  label.className = "timer-row__label";
  label.textContent = t(labelKey);

  const fieldsRow = document.createElement("div");
  fieldsRow.className = "timer-hms";

  const hours = createNumberField({
    labelKey: "awake.duration.hoursLabel",
    suffixKey: "timer.fields.hoursSuffix",
    min: 0,
    max: 23,
    value: value.hours,
  });
  const minutes = createNumberField({
    labelKey: "awake.duration.minutesLabel",
    suffixKey: "timer.fields.minutesSuffix",
    min: 0,
    max: 59,
    value: value.minutes,
  });
  const seconds = createNumberField({
    labelKey: "clock.settings.second",
    suffixKey: "timer.fields.secondsSuffix",
    min: 0,
    max: 59,
    value: value.seconds,
  });
  // The field labels ("Hours"/"Minutes"/"Seconds") are redundant once the
  // section already says "Work Time" etc.; keep them for a11y, hide visually.
  for (const f of [hours, minutes, seconds]) {
    f.wrap.querySelector(".num-field__label")?.classList.add("visually-hidden");
  }

  const emit = (): void => {
    onChange(
      clampHms({
        hours: Number.parseInt(hours.input.value, 10),
        minutes: Number.parseInt(minutes.input.value, 10),
        seconds: Number.parseInt(seconds.input.value, 10),
      }),
    );
  };
  hours.input.addEventListener("input", emit);
  minutes.input.addEventListener("input", emit);
  seconds.input.addEventListener("input", emit);

  fieldsRow.append(hours.wrap, minutes.wrap, seconds.wrap);
  section.append(label, fieldsRow);
  return section;
}

/** Alarm "Ring at" HH:MM group, styled like the H:M:S sections. */
function alarmTimeSection(
  value: TimeOfDay,
  onChange: (time: TimeOfDay) => void,
): HTMLElement {
  const section = document.createElement("div");
  section.className = "timer-hms-section";
  const label = document.createElement("span");
  label.className = "timer-row__label";
  label.textContent = t("timer.fields.alarmAt");

  const fieldsRow = document.createElement("div");
  fieldsRow.className = "hero__custom timer-hms";

  const hours = createNumberField({
    labelKey: "awake.duration.hoursLabel",
    suffixKey: "timer.fields.hoursSuffix",
    min: 0,
    max: 23,
    value: value.hours,
  });
  const minutes = createNumberField({
    labelKey: "awake.duration.minutesLabel",
    suffixKey: "timer.fields.minutesSuffix",
    min: 0,
    max: 59,
    value: value.minutes,
  });
  for (const f of [hours, minutes]) {
    f.wrap.querySelector(".num-field__label")?.classList.add("visually-hidden");
  }

  const emit = (): void => {
    onChange(
      clampTimeOfDay({
        hours: Number.parseInt(hours.input.value, 10),
        minutes: Number.parseInt(minutes.input.value, 10),
      }),
    );
  };
  hours.input.addEventListener("input", emit);
  minutes.input.addEventListener("input", emit);

  fieldsRow.append(hours.wrap, minutes.wrap);
  section.append(label, fieldsRow);
  return section;
}

/** Native dropdown of the synthesized alarm tones. */
function toneSelect(
  value: AlarmTone,
  onChange: (tone: AlarmTone) => void,
): HTMLSelectElement {
  const select = document.createElement("select");
  select.className = "timer-tone-select";
  select.setAttribute("aria-label", t("timer.fields.tone"));
  for (const tone of ALARM_TONES) {
    const option = document.createElement("option");
    option.value = tone;
    option.textContent = t(`timer.tone.${tone}`);
    select.appendChild(option);
  }
  select.value = value;
  select.addEventListener("change", () => onChange(select.value as AlarmTone));
  return select;
}

/** 0–100 range slider mapped to a 0–1 volume. */
function volumeSlider(
  value: number,
  onInput: (volume: number) => void,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "timer-volume";
  const range = document.createElement("input");
  range.type = "range";
  range.min = "0";
  range.max = "100";
  range.step = "5";
  range.value = String(Math.round(clampVolume(value) * 100));
  range.className = "timer-volume__range";
  range.setAttribute("aria-label", t("timer.fields.volume"));
  range.addEventListener("input", () => onInput(Number(range.value) / 100));
  wrap.append(range);
  return wrap;
}

export function createTimerSettingsPanel(
  initial: TimerSettings,
  onChange: (next: TimerSettings) => void,
): TimerSettingsPanel {
  let cur: TimerSettings = { ...initial };
  const emit = (): void => onChange({ ...cur });
  let open = false;

  const panel = document.createElement("div");
  panel.className = "timer-panel";
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", t("common.settings"));
  panel.hidden = true;

  const header = document.createElement("div");
  header.className = "timer-panel__header";
  const title = document.createElement("h2");
  title.className = "timer-panel__title";
  title.textContent = t("common.settings");
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "icon-button";
  closeBtn.setAttribute("aria-label", t("common.close"));
  closeBtn.innerHTML = icons.close;
  header.append(title, closeBtn);

  const body = document.createElement("div");
  body.className = "timer-panel__body";

  panel.append(header, body);

  const modeSeg = createSegmented<TimerMode>({
    label: t("timer.fields.mode"),
    value: cur.mode,
    items: [
      { value: "countdown", label: t("timer.mode.countdown") },
      { value: "stopwatch", label: t("timer.mode.stopwatch") },
      { value: "alarm", label: t("timer.mode.alarm") },
    ],
    onChange: (v) => {
      cur = { ...cur, mode: v };
      rebuildDynamic();
      emit();
    },
  });
  body.append(row(t("timer.fields.mode"), modeSeg.element));

  const dynamic = document.createElement("div");
  dynamic.className = "timer-panel__body";
  body.append(dynamic);

  let typeSeg: ReturnType<typeof createSegmented<CountdownType>> | null = null;

  /** Tone dropdown + volume slider, previewing the tone on any change. */
  function appendAlarmSoundControls(): void {
    dynamic.append(
      row(
        t("timer.fields.tone"),
        toneSelect(cur.alarmTone, (v) => {
          cur = { ...cur, alarmTone: v };
          emit();
          playAlarm(v, cur.alarmVolume);
        }),
      ),
      row(
        t("timer.fields.volume"),
        volumeSlider(cur.alarmVolume, (v) => {
          cur = { ...cur, alarmVolume: v };
          emit();
          playAlarm(cur.alarmTone, v);
        }),
      ),
    );
  }

  function rebuildDynamic(): void {
    dynamic.replaceChildren();
    typeSeg = null;

    if (cur.mode === "alarm") {
      dynamic.append(
        alarmTimeSection(cur.alarmTime, (time) => {
          cur = { ...cur, alarmTime: time };
          emit();
        }),
      );
      appendAlarmSoundControls();
      return;
    }

    if (cur.mode === "stopwatch") {
      const msToggle = createToggle({
        label: t("timer.fields.milliseconds"),
        checked: cur.milliseconds,
        onChange: (v) => {
          cur = { ...cur, milliseconds: v };
          emit();
        },
      });
      // Use the bare switch (not .element): the row() wrapper already shows
      // the label, and .toggle's own wrapper stretches to 100% width.
      dynamic.append(row(t("timer.fields.milliseconds"), msToggle.button));
      return;
    }

    typeSeg = createSegmented<CountdownType>({
      label: t("timer.fields.type"),
      value: cur.type,
      items: [
        { value: "simple", label: t("timer.type.simple"), icon: icons.clock },
        {
          value: "interval",
          label: t("timer.type.interval"),
          icon: icons.repeat,
        },
        { value: "bell", label: t("timer.type.bell"), icon: icons.bell },
      ],
      onChange: (v) => {
        cur = { ...cur, type: v };
        rebuildDynamic();
        emit();
      },
    });
    dynamic.append(row(t("timer.fields.type"), typeSeg.element));

    if (cur.type === "simple") {
      dynamic.append(
        hmsSection("timer.fields.setTime", cur.simpleTime, (hms) => {
          cur = { ...cur, simpleTime: hms };
          emit();
        }),
      );
    } else if (cur.type === "interval") {
      dynamic.append(
        hmsSection("timer.fields.workTime", cur.workTime, (hms) => {
          cur = { ...cur, workTime: hms };
          emit();
        }),
        hmsSection("timer.fields.restTime", cur.restTime, (hms) => {
          cur = { ...cur, restTime: hms };
          emit();
        }),
      );
      const roundsField = createNumberField({
        labelKey: "timer.fields.rounds",
        suffixKey: "timer.fields.roundsSuffix",
        min: 1,
        max: 99,
        value: cur.rounds,
      });
      roundsField.wrap
        .querySelector(".num-field__label")
        ?.classList.add("visually-hidden");
      roundsField.input.addEventListener("input", () => {
        cur = {
          ...cur,
          rounds: clampRounds(Number.parseInt(roundsField.input.value, 10)),
        };
        emit();
      });
      dynamic.append(row(t("timer.fields.rounds"), roundsField.wrap));

      const longBreakEveryField = createNumberField({
        labelKey: "timer.fields.longBreakEvery",
        suffixKey: "timer.fields.longBreakEverySuffix",
        min: 0,
        max: 99,
        value: cur.longBreakEvery,
      });
      longBreakEveryField.wrap
        .querySelector(".num-field__label")
        ?.classList.add("visually-hidden");
      longBreakEveryField.input.addEventListener("input", () => {
        cur = {
          ...cur,
          longBreakEvery: clampLongBreakEvery(
            Number.parseInt(longBreakEveryField.input.value, 10),
          ),
        };
        emit();
      });
      dynamic.append(
        row(t("timer.fields.longBreakEvery"), longBreakEveryField.wrap),
        hmsSection("timer.fields.longBreakTime", cur.longBreakTime, (hms) => {
          cur = { ...cur, longBreakTime: hms };
          emit();
        }),
      );
    } else {
      dynamic.append(
        hmsSection("timer.fields.totalTime", cur.totalTime, (hms) => {
          cur = { ...cur, totalTime: hms };
          emit();
        }),
        hmsSection("timer.fields.bellInterval", cur.bellInterval, (hms) => {
          cur = { ...cur, bellInterval: hms };
          emit();
        }),
      );
    }

    const alarmToggle = createToggle({
      label: t("timer.fields.alarmSound"),
      checked: cur.alarmSound,
      onChange: (v) => {
        cur = { ...cur, alarmSound: v };
        rebuildDynamic();
        emit();
      },
    });
    dynamic.append(row(t("timer.fields.alarmSound"), alarmToggle.button));
    if (cur.alarmSound) appendAlarmSoundControls();
  }
  rebuildDynamic();

  function setOpen(next: boolean): void {
    open = next;
    panel.hidden = !open;
    panel.classList.toggle("timer-panel--open", open);
    if (open)
      requestAnimationFrame(() => panel.classList.add("timer-panel--in"));
    else panel.classList.remove("timer-panel--in");
  }

  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && open) setOpen(false);
  };
  document.addEventListener("keydown", onKeydown);
  closeBtn.addEventListener("click", () => setOpen(false));

  return {
    element: panel,
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!open),
    isOpen: () => open,
    destroy() {
      document.removeEventListener("keydown", onKeydown);
      modeSeg.destroy();
      typeSeg?.destroy();
      panel.remove();
    },
  };
}
