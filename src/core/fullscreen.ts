/**
 * Fullscreen API helper with webkit-prefixed fallbacks (older Safari / iOS).
 *
 * All calls are guarded and never throw to the UI. Subscribe via onChange to
 * keep buttons in sync (fullscreen can be exited with Esc, without a click).
 */

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  onwebkitfullscreenchange?: unknown;
}

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

function fsDoc(): FullscreenDocument {
  return document as FullscreenDocument;
}

export function isFullscreenSupported(): boolean {
  const el = document.documentElement as FullscreenElement;
  return Boolean(el.requestFullscreen || el.webkitRequestFullscreen);
}

export function isFullscreen(): boolean {
  const d = fsDoc();
  return Boolean(d.fullscreenElement || d.webkitFullscreenElement);
}

export async function requestFullscreen(
  target: HTMLElement = document.documentElement,
): Promise<boolean> {
  const el = target as FullscreenElement;
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return true;
    }
    if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
      return true;
    }
  } catch {
    // Denied or unsupported; report via isFullscreen() polling / onChange.
  }
  return false;
}

export async function exitFullscreen(): Promise<boolean> {
  const d = fsDoc();
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      return true;
    }
    if (d.webkitExitFullscreen) {
      await d.webkitExitFullscreen();
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

/** Toggle fullscreen for the given element. Returns the resulting state. */
export async function toggleFullscreen(
  target: HTMLElement = document.documentElement,
): Promise<boolean> {
  if (isFullscreen()) {
    await exitFullscreen();
  } else {
    await requestFullscreen(target);
  }
  return isFullscreen();
}

/** Subscribe to fullscreen change events. Returns an unsubscribe function. */
export function onFullscreenChange(
  callback: (active: boolean) => void,
): () => void {
  const handler = (): void => callback(isFullscreen());
  document.addEventListener("fullscreenchange", handler);
  document.addEventListener("webkitfullscreenchange", handler);
  return () => {
    document.removeEventListener("fullscreenchange", handler);
    document.removeEventListener("webkitfullscreenchange", handler);
  };
}
