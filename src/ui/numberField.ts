/**
 * A labeled number input with a unit suffix (e.g. "0 h", "30 m"), styled as a
 * boxed field. Native spinner buttons are hidden via CSS (see .num-field in
 * base.css) since they clip digits in a narrow box; the box centers the text
 * instead.
 */

import { t } from "../core/i18n";

export interface NumberFieldOptions {
  labelKey: string;
  suffixKey: string;
  min: number;
  max: number;
  value: number;
}

export interface NumberField {
  wrap: HTMLElement;
  input: HTMLInputElement;
}

export function createNumberField(options: NumberFieldOptions): NumberField {
  const wrap = document.createElement("label");
  wrap.className = "num-field";

  const label = document.createElement("span");
  label.className = "num-field__label";
  label.textContent = t(options.labelKey);

  const box = document.createElement("span");
  box.className = "num-field__box";

  const input = document.createElement("input");
  input.type = "number";
  input.className = "num-field__input";
  input.inputMode = "numeric";
  input.min = String(options.min);
  input.max = String(options.max);
  input.value = String(options.value);

  const suffix = document.createElement("span");
  suffix.className = "num-field__suffix";
  suffix.setAttribute("aria-hidden", "true");
  suffix.textContent = t(options.suffixKey);

  box.append(input, suffix);
  wrap.append(label, box);
  return { wrap, input };
}
