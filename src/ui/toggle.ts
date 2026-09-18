/**
 * Reusable accessible toggle switch.
 *
 * Renders a <button role="switch"> with aria-checked, a visible label, and a
 * visible focus ring (styled in base.css). Space/Enter and click toggle it.
 * Returns a small controller so callers can read/set state and clean up.
 */

export interface ToggleOptions {
  /** Accessible + visible label text. */
  label: string;
  /** Initial checked state. Default false. */
  checked?: boolean;
  /** Called whenever the value changes (from user interaction or setChecked). */
  onChange?: (checked: boolean) => void;
  /** Optional id for the control (for external <label for> associations). */
  id?: string;
  /** Visual size. "lg" is the large 72×40 switch. Default "md". */
  size?: "md" | "lg";
  /** Accent color when on. "success" turns the track green. Default "accent". */
  tone?: "accent" | "success";
  /** Hide the text label visually (still exposed to assistive tech). */
  hideLabel?: boolean;
}

export interface ToggleController {
  /** The root element to insert into the DOM. */
  readonly element: HTMLElement;
  /** The interactive switch button. */
  readonly button: HTMLButtonElement;
  isChecked(): boolean;
  /** Programmatically set state. `silent` skips the onChange callback. */
  setChecked(checked: boolean, silent?: boolean): void;
  setDisabled(disabled: boolean): void;
  destroy(): void;
}

let uid = 0;

export function createToggle(options: ToggleOptions): ToggleController {
  const { label, onChange } = options;
  let checked = options.checked ?? false;

  const size = options.size ?? "md";
  const tone = options.tone ?? "accent";

  const root = document.createElement("div");
  root.className = "toggle";
  if (size === "lg") root.classList.add("toggle--lg");
  if (tone === "success") root.classList.add("toggle--success");

  const labelId = options.id ? `${options.id}-label` : `toggle-label-${++uid}`;

  const text = document.createElement("span");
  text.className = "toggle__label";
  text.id = labelId;
  text.textContent = label;
  if (options.hideLabel) text.classList.add("visually-hidden");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "toggle__switch";
  button.setAttribute("role", "switch");
  button.setAttribute("aria-checked", String(checked));
  button.setAttribute("aria-labelledby", labelId);
  if (options.id) button.id = options.id;

  const thumb = document.createElement("span");
  thumb.className = "toggle__thumb";
  thumb.setAttribute("aria-hidden", "true");
  button.appendChild(thumb);

  root.append(text, button);

  function render(): void {
    button.setAttribute("aria-checked", String(checked));
    root.classList.toggle("toggle--on", checked);
  }

  function setChecked(next: boolean, silent = false): void {
    if (next === checked) return;
    checked = next;
    render();
    if (!silent) onChange?.(checked);
  }

  const handleClick = (): void => setChecked(!checked);

  button.addEventListener("click", handleClick);
  render();

  return {
    element: root,
    button,
    isChecked: () => checked,
    setChecked,
    setDisabled(disabled: boolean) {
      button.disabled = disabled;
      root.classList.toggle("toggle--disabled", disabled);
    },
    destroy() {
      button.removeEventListener("click", handleClick);
      root.remove();
    },
  };
}
