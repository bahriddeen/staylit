/**
 * Minimal, accessible toast notifications. A single polite live region hosts
 * transient messages; each toast auto-dismisses and animates out (respecting
 * prefers-reduced-motion via CSS). Import and call showToast().
 */

let container: HTMLElement | null = null;

function ensureContainer(): HTMLElement {
  if (container && document.body.contains(container)) return container;
  const el = document.createElement("div");
  el.className = "toast-region";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  document.body.appendChild(el);
  container = el;
  return el;
}

export interface ToastOptions {
  /** Milliseconds before auto-dismiss. Default 3200. */
  duration?: number;
  /** Optional leading icon as an SVG/HTML string. */
  icon?: string;
}

/** Show a transient toast message. Returns a function to dismiss it early. */
export function showToast(
  message: string,
  options: ToastOptions = {},
): () => void {
  const region = ensureContainer();
  const { duration = 3200, icon } = options;

  const toast = document.createElement("div");
  toast.className = "toast";

  if (icon) {
    const iconEl = document.createElement("span");
    iconEl.className = "toast__icon";
    iconEl.setAttribute("aria-hidden", "true");
    iconEl.innerHTML = icon;
    toast.appendChild(iconEl);
  }

  const text = document.createElement("span");
  text.className = "toast__message";
  text.textContent = message;
  toast.appendChild(text);

  region.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast--in"));

  let dismissed = false;
  const dismiss = (): void => {
    if (dismissed) return;
    dismissed = true;
    clearTimeout(timer);
    toast.classList.remove("toast--in");
    toast.addEventListener("transitionend", () => toast.remove(), {
      once: true,
    });
    // Fallback removal if no transition (reduced motion).
    setTimeout(() => toast.remove(), 400);
  };

  const timer = setTimeout(dismiss, duration);
  return dismiss;
}
