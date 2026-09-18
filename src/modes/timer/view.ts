/**
 * Timer stage view: the big digit display, the work/rest phase label (Interval
 * type only), and the Play/Pause/Reset controls. Pure rendering — no engine
 * logic lives here, the controller wires button clicks to the TimerEngine and
 * calls render(state) on every tick.
 */

import { t } from "../../core/i18n";
import { icons } from "../../ui/icons";
import { formatHMS, formatStopwatch, formatStopwatchParts } from "./format";
import type { TimerSettings, TimerState } from "./logic";

export interface TimerViewHandlers {
  onStart(): void;
  onPause(): void;
  onReset(): void;
  onSplit(): void;
}

export interface TimerView {
  element: HTMLElement;
  render(state: TimerState, settings: TimerSettings): void;
}

function controlButton(label: string, icon: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "timer-btn";
  btn.setAttribute("aria-label", label);
  btn.title = label;
  btn.innerHTML = icon;
  return btn;
}

export function createTimerView(handlers: TimerViewHandlers): TimerView {
  const root = document.createElement("div");
  root.className = "timer-stage";

  const display = document.createElement("div");
  display.className = "timer-display";
  display.setAttribute("role", "timer");
  const displayMain = document.createTextNode("");
  const displayFraction = document.createElement("span");
  displayFraction.className = "timer-display__ms";
  let displaySplit = false;

  const phase = document.createElement("div");
  phase.className = "timer-phase";
  phase.hidden = true;

  const controls = document.createElement("div");
  controls.className = "timer-controls";

  const playBtn = controlButton(t("timer.buttons.start"), icons.play);
  playBtn.classList.add("timer-btn--play");
  playBtn.addEventListener("click", handlers.onStart);

  const pauseBtn = controlButton(t("timer.buttons.pause"), icons.pause);
  pauseBtn.addEventListener("click", handlers.onPause);

  const resetBtn = controlButton(t("timer.buttons.reset"), icons.reset);
  resetBtn.addEventListener("click", handlers.onReset);

  const splitBtn = controlButton(t("timer.buttons.split"), icons.flag);
  splitBtn.addEventListener("click", handlers.onSplit);

  const laps = document.createElement("ol");
  laps.className = "timer-laps";
  laps.setAttribute("aria-label", t("timer.laps.label"));

  root.append(display, phase, controls, laps);

  // Stopwatch (iOS-style): running -> [Pause, Split]; paused -> [Play, Reset].
  // Countdown: running -> [Pause, Reset]; paused -> [Play, Reset]. Either way,
  // idle/finished is a single Play that (re)starts fresh.
  let lastKey = "";
  function renderControls(
    status: TimerState["status"],
    isStopwatch: boolean,
  ): void {
    const key = `${status}:${isStopwatch}`;
    if (key === lastKey) return;
    lastKey = key;

    controls.replaceChildren();
    if (status === "running") {
      controls.append(pauseBtn, isStopwatch ? splitBtn : resetBtn);
    } else if (status === "paused") {
      controls.append(playBtn, resetBtn);
    } else {
      controls.append(playBtn);
    }
  }
  renderControls("idle", false);

  let lastLapsKey = "";
  function renderLaps(entries: TimerState["laps"], withMs: boolean): void {
    const key = `${entries.length}:${withMs}`;
    if (key === lastLapsKey) return;
    lastLapsKey = key;

    if (entries.length === 0) {
      laps.replaceChildren();
      return;
    }
    laps.replaceChildren();
    const lastIndex = entries.length - 1;
    entries.forEach((lap, i) => {
      const li = document.createElement("li");
      li.className = "timer-laps__row";
      if (i === lastIndex) li.classList.add("timer-laps__row--latest");
      const label = document.createElement("span");
      label.className = "timer-laps__index";
      label.textContent = `# ${lap.index}`;
      const value = document.createElement("span");
      value.className = "timer-laps__time";
      value.textContent = formatStopwatch(lap.totalMs, withMs);
      li.append(label, value);
      laps.appendChild(li);
    });
    laps.scrollTop = laps.scrollHeight;
  }

  function render(state: TimerState, settings: TimerSettings): void {
    if (settings.mode === "stopwatch" && settings.milliseconds) {
      const { main, fraction } = formatStopwatchParts(state.valueMs);
      if (!displaySplit) {
        display.replaceChildren(displayMain, displayFraction);
        displaySplit = true;
      }
      if (displayMain.data !== main) displayMain.data = main;
      if (displayFraction.textContent !== fraction)
        displayFraction.textContent = fraction;
    } else {
      const text =
        settings.mode === "stopwatch"
          ? formatStopwatch(state.valueMs, false)
          : formatHMS(state.valueMs);
      if (displaySplit) {
        display.replaceChildren();
        displaySplit = false;
      }
      if (displayMain.data !== text) displayMain.data = text;
      if (!display.firstChild) display.append(displayMain);
    }

    if (state.phase) {
      const label = `${t(`timer.phase.${state.phase}`)} ${state.round}/${state.totalRounds}`;
      if (phase.textContent !== label) phase.textContent = label;
      phase.hidden = false;
    } else {
      phase.hidden = true;
    }

    const isStopwatch = settings.mode === "stopwatch";
    renderControls(state.status, isStopwatch);
    if (isStopwatch) renderLaps(state.laps, settings.milliseconds);
    else if (state.laps.length > 0 || laps.childElementCount > 0) {
      renderLaps([], settings.milliseconds);
    }
  }

  return { element: root, render };
}
