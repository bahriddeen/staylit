/**
 * Small layout helpers for settings drawers: a labeled field wrapper and a
 * bare row wrapper (used for toggles, which carry their own label).
 */

export function settingsField(
  labelText: string,
  control: HTMLElement,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "settings__field";
  const label = document.createElement("span");
  label.className = "settings__label";
  label.textContent = labelText;
  wrap.append(label, control);
  return wrap;
}

export function settingsRow(control: HTMLElement): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "settings__row";
  wrap.append(control);
  return wrap;
}

/** Label-left / control-right row (e.g. "Format" next to its segmented control). */
export function inlineSettingsRow(
  labelText: string,
  control: HTMLElement,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "settings-inline-row";
  const label = document.createElement("span");
  label.className = "settings-inline-row__label";
  label.textContent = labelText;
  wrap.append(label, control);
  return wrap;
}
