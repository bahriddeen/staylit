/**
 * Reusable modal / drawer with a focus trap, Esc-to-close, backdrop click, and
 * focus restoration. Built as a dialog-like region (role="dialog",
 * aria-modal="true"). Kept dependency-free and framework-agnostic.
 */

import { icons } from "./icons";

export interface ModalOptions {
  /** Accessible title, shown in the header. */
  title: string;
  /** Content node placed in the body. */
  content: Node;
  /** Visual style. "drawer" slides from the edge; "modal" is centered. */
  variant?: "modal" | "drawer";
  /** Label for the close button. Default "Close". */
  closeLabel?: string;
  /** Called after the modal is closed. */
  onClose?: () => void;
}

export interface ModalController {
  readonly element: HTMLElement;
  open(): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

let uid = 0;

export function createModal(options: ModalOptions): ModalController {
  const { title, content, variant = "modal", onClose } = options;
  const titleId = `modal-title-${++uid}`;
  let open = false;
  let lastFocused: HTMLElement | null = null;

  const overlay = document.createElement("div");
  overlay.className = `modal modal--${variant}`;
  overlay.hidden = true;

  const backdrop = document.createElement("div");
  backdrop.className = "modal__backdrop";
  backdrop.setAttribute("aria-hidden", "true");

  const dialog = document.createElement("div");
  dialog.className = "modal__dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", titleId);

  const header = document.createElement("div");
  header.className = "modal__header";

  const heading = document.createElement("h2");
  heading.className = "modal__title";
  heading.id = titleId;
  heading.textContent = title;

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "modal__close icon-button";
  closeBtn.setAttribute("aria-label", options.closeLabel ?? "Close");
  closeBtn.innerHTML = icons.close;

  header.append(heading, closeBtn);

  const body = document.createElement("div");
  body.className = "modal__body";
  body.appendChild(content);

  dialog.append(header, body);
  overlay.append(backdrop, dialog);

  function focusables(): HTMLElement[] {
    return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "Tab") return;
    const items = focusables();
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openModal(): void {
    if (open) return;
    open = true;
    lastFocused = document.activeElement as HTMLElement | null;
    overlay.hidden = false;
    // Next frame lets the transition run from the hidden state.
    requestAnimationFrame(() => overlay.classList.add("modal--open"));
    document.addEventListener("keydown", onKeydown, true);
    (focusables()[0] ?? closeBtn).focus();
  }

  function close(): void {
    if (!open) return;
    open = false;
    overlay.classList.remove("modal--open");
    document.removeEventListener("keydown", onKeydown, true);
    overlay.hidden = true;
    lastFocused?.focus?.();
    onClose?.();
  }

  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);

  return {
    element: overlay,
    open: openModal,
    close,
    isOpen: () => open,
    destroy() {
      document.removeEventListener("keydown", onKeydown, true);
      closeBtn.removeEventListener("click", close);
      backdrop.removeEventListener("click", close);
      overlay.remove();
    },
  };
}
