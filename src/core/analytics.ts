/**
 * Optional, cookieless usage analytics (Umami).
 *
 * Off unless VITE_UMAMI_WEBSITE_ID is set at build time, so local builds and
 * forks send nothing. Umami stores no cookies and no personal data; the script
 * honours the browser's Do Not Track setting. Every call is guarded so a
 * blocked or failed script never affects the app.
 */

const WEBSITE_ID = import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined;
const SCRIPT_SRC =
  (import.meta.env.VITE_UMAMI_SCRIPT_URL as string | undefined) ??
  "https://cloud.umami.is/script.js";

interface Umami {
  track(event: string, data?: Record<string, string | number | boolean>): void;
}

declare global {
  interface Window {
    umami?: Umami;
  }
}

/** Inject the Umami script once. No-op when analytics is not configured. */
export function initAnalytics(): void {
  if (!WEBSITE_ID || typeof document === "undefined") return;
  if (document.querySelector("script[data-website-id]")) return;
  const script = document.createElement("script");
  script.defer = true;
  script.src = SCRIPT_SRC;
  script.dataset.websiteId = WEBSITE_ID;
  script.dataset.doNotTrack = "true";
  document.head.appendChild(script);
}

/** Record a named event. Silently dropped if the script is absent or blocked. */
export function track(
  event: string,
  data?: Record<string, string | number | boolean>,
): void {
  try {
    window.umami?.track(event, data);
  } catch {
    /* analytics must never break the app */
  }
}
