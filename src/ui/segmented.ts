/**
 * Reusable segmented / pill control. Rendered as a radiogroup so arrow keys move
 * between options and only the selected pill is in the tab order (roving
 * tabindex). Fully keyboard accessible with visible focus rings from base.css.
 */

export interface SegmentedItem<V extends string> {
  value: V;
  label: string;
  /** Optional icon HTML shown instead of the text label; `label` still backs
   * the accessible name (aria-label + title) when an icon is used. */
  icon?: string;
}

export interface SegmentedOptions<V extends string> {
  /** Accessible group label. */
  label: string;
  items: SegmentedItem<V>[];
  value: V;
  onChange?: (value: V) => void;
}

export interface SegmentedController<V extends string> {
  readonly element: HTMLElement;
  getValue(): V;
  setValue(value: V, silent?: boolean): void;
  destroy(): void;
}

export function createSegmented<V extends string>(
  options: SegmentedOptions<V>,
): SegmentedController<V> {
  const { label, items, onChange } = options;
  let value = options.value;

  const group = document.createElement("div");
  group.className = "segmented";
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-label", label);

  const buttons = new Map<V, HTMLButtonElement>();

  function render(): void {
    for (const [val, btn] of buttons) {
      const selected = val === value;
      btn.setAttribute("aria-checked", String(selected));
      btn.tabIndex = selected ? 0 : -1;
      btn.classList.toggle("segmented__pill--on", selected);
    }
  }

  function select(next: V, silent = false, focus = false): void {
    if (next === value) {
      if (focus) buttons.get(next)?.focus();
      return;
    }
    value = next;
    render();
    if (focus) buttons.get(next)?.focus();
    if (!silent) onChange?.(value);
  }

  function moveFocus(delta: number): void {
    const values = items.map((i) => i.value);
    const idx = values.indexOf(value);
    const nextIdx = (idx + delta + values.length) % values.length;
    select(values[nextIdx]!, false, true);
  }

  const onKeydown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        moveFocus(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        moveFocus(-1);
        break;
    }
  };

  for (const item of items) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "segmented__pill";
    btn.setAttribute("role", "radio");
    if (item.icon) {
      btn.classList.add("segmented__pill--icon");
      btn.innerHTML = item.icon;
      btn.setAttribute("aria-label", item.label);
      btn.title = item.label;
    } else {
      btn.textContent = item.label;
    }
    btn.addEventListener("click", () => select(item.value));
    btn.addEventListener("keydown", onKeydown);
    buttons.set(item.value, btn);
    group.appendChild(btn);
  }

  render();

  return {
    element: group,
    getValue: () => value,
    setValue: (v, silent) => select(v, silent ?? true),
    destroy() {
      for (const btn of buttons.values()) {
        btn.replaceWith(btn.cloneNode(true)); // drop listeners
      }
      group.remove();
    },
  };
}
