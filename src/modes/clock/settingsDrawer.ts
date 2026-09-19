/**
 * Settings drawer (slides in from the right; full-width sheet on mobile). Uses
 * the shared modal in "drawer" mode for focus-trap / Esc / backdrop handling.
 * Controls: Format (segmented 24/12), Seconds and Day-and-Year toggles, and a
 * 2-column grid of live template preview tiles (each rendered in that template's
 * real style). Emits the full updated settings on any change.
 */

import { t } from "../../core/i18n";
import { icons } from "../../ui/icons";
import { createModal, type ModalController } from "../../ui/modal";
import { createSegmented } from "../../ui/segmented";
import { createToggle } from "../../ui/toggle";
import { inlineSettingsRow, settingsRow } from "../../ui/settingsField";
import type { ClockSettings, ClockView, TimeFormat } from "./settings";
import {
  DIGITAL_TEMPLATES,
  FLIP_TEMPLATES,
  type DigitalTemplate,
  type FlipTemplate,
} from "./templates";

export interface SettingsDrawer {
  readonly modal: ModalController;
  open(): void;
  close(): void;
  destroy(): void;
}

const PREVIEW_TIME = "24:00:00";

export function createSettingsDrawer(
  view: ClockView,
  initial: ClockSettings,
  onChange: (next: ClockSettings) => void,
  onShare: () => void,
): SettingsDrawer {
  let cur: ClockSettings = { ...initial };
  const emit = (): void => onChange({ ...cur });

  const body = document.createElement("div");
  body.className = "settings";

  // Format
  const formatSeg = createSegmented<TimeFormat>({
    label: t("clock.settings.format"),
    value: cur.format,
    items: [
      { value: "24", label: t("clock.settings.format24") },
      { value: "12", label: t("clock.settings.format12") },
    ],
    onChange: (v) => {
      cur = { ...cur, format: v };
      emit();
    },
  });
  body.append(inlineSettingsRow(t("clock.settings.format"), formatSeg.element));

  // Seconds
  const secondsToggle = createToggle({
    label: t("clock.settings.second"),
    checked: cur.seconds,
    onChange: (v) => {
      cur = { ...cur, seconds: v };
      emit();
    },
  });
  body.append(settingsRow(secondsToggle.element));

  // Day and Year
  const dayToggle = createToggle({
    label: t("clock.settings.dayYear"),
    checked: cur.dayAndYear,
    onChange: (v) => {
      cur = { ...cur, dayAndYear: v };
      emit();
    },
  });
  body.append(settingsRow(dayToggle.element));

  // Templates
  const tplField = document.createElement("div");
  tplField.className = "settings__field";
  const tplLabel = document.createElement("span");
  tplLabel.className = "settings__label";
  tplLabel.textContent = t("clock.settings.template");
  const grid = document.createElement("div");
  grid.className = "template-grid";

  const tiles = new Map<string, HTMLButtonElement>();
  const list =
    view === "digital"
      ? DIGITAL_TEMPLATES.map((tpl) => tile(tpl))
      : FLIP_TEMPLATES.map((tpl) => tile(tpl));
  for (const { id, el } of list) {
    tiles.set(id, el);
    el.addEventListener("click", () => {
      cur = { ...cur, template: id };
      updateSelection();
      emit();
    });
    grid.appendChild(el);
  }
  tplField.append(tplLabel, grid);
  body.append(tplField);

  // Share
  const shareBtn = document.createElement("button");
  shareBtn.type = "button";
  shareBtn.className = "button clock-share-btn";
  const shareIcon = document.createElement("span");
  shareIcon.className = "button__icon";
  shareIcon.setAttribute("aria-hidden", "true");
  shareIcon.innerHTML = icons.share;
  shareBtn.append(shareIcon, document.createTextNode(t("common.share")));
  shareBtn.addEventListener("click", onShare);
  body.append(shareBtn);

  function updateSelection(): void {
    for (const [id, el] of tiles) {
      const selected = id === cur.template;
      el.classList.toggle("template-tile--selected", selected);
      el.setAttribute("aria-pressed", String(selected));
    }
  }
  updateSelection();

  const modal = createModal({
    title: t("clock.settings.title"),
    content: body,
    variant: "drawer",
    closeLabel: t("common.close"),
  });
  document.body.appendChild(modal.element);

  return {
    modal,
    open: modal.open,
    close: modal.close,
    destroy() {
      formatSeg.destroy();
      secondsToggle.destroy();
      dayToggle.destroy();
      modal.destroy();
    },
  };
}

function tile(tpl: DigitalTemplate | FlipTemplate): {
  id: string;
  el: HTMLButtonElement;
} {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "template-tile";
  el.setAttribute("role", "radio");

  const preview = document.createElement("div");
  preview.className = "template-tile__preview";
  for (const [k, v] of Object.entries(tpl.vars)) {
    preview.style.setProperty(k, v);
  }

  if ("seg" in tpl) {
    preview.classList.add("template-tile__preview--digital");
    preview.dataset.seg = String(tpl.seg);
    const time = document.createElement("span");
    time.className = "template-tile__time";
    time.textContent = PREVIEW_TIME;
    preview.appendChild(time);
  } else {
    preview.classList.add("template-tile__preview--flip");
    for (const ch of PREVIEW_TIME) {
      const chip = document.createElement("span");
      chip.className =
        ch === ":" ? "template-tile__colon" : "template-tile__chip";
      chip.textContent = ch;
      preview.appendChild(chip);
    }
  }

  const name = document.createElement("span");
  name.className = "template-tile__name";
  name.textContent = tpl.name;

  el.append(preview, name);
  return { id: tpl.id, el };
}
