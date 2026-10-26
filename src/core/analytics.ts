/**
 * Optional, cookieless usage analytics (Umami).
 *
 * On by default only on the production host (staylit.live), so local dev,
 * previews and forks send nothing. VITE_UMAMI_WEBSITE_ID overrides the site ID
 * anywhere. Umami stores no cookies and no personal data; the script
 * honours the browser's Do Not Track setting. Every call is guarded so a
 * blocked or failed script never affects the app.
 */

const ENV_WEBSITE_ID = import.meta.env.VITE_UMAMI_WEBSITE_ID as
  string | undefined;
const PRODUCTION_HOST = "staylit.live";
// Public site ID (it ships in the page anyway); safe to commit.
const PRODUCTION_WEBSITE_ID = "ade4e16f-f666-4adf-8eae-95d177e9eaaf";
const ENV_SCRIPT_URL = import.meta.env.VITE_UMAMI_SCRIPT_URL as
  string | undefined;
// Same-origin path proxied to Umami Cloud by nginx.conf / vercel.json, so
// privacy blockers that drop third-party analytics hosts don't skip the count.
const PROXIED_SCRIPT_PATH = "/s/l.js";

interface Umami {
  track(event: string, data?: Record<string, string | number | boolean>): void;
}

declare global {
  interface Window {
    umami?: Umami;
  }
}

/** The site ID to report to, or undefined when analytics should stay off. */
export function resolveWebsiteId(
  hostname: string,
  envId: string | undefined = ENV_WEBSITE_ID,
): string | undefined {
  if (envId) return envId;
  return hostname === PRODUCTION_HOST ? PRODUCTION_WEBSITE_ID : undefined;
}

/** Inject the Umami script once. No-op when analytics is not configured. */
export function initAnalytics(): void {
  if (typeof document === "undefined") return;
  const websiteId = resolveWebsiteId(location.hostname);
  if (!websiteId) return;
  if (document.querySelector("script[data-website-id]")) return;
  const script = document.createElement("script");
  script.defer = true;
  script.src = ENV_SCRIPT_URL ?? PROXIED_SCRIPT_PATH;
  script.dataset.websiteId = websiteId;
  // Send the beacon to this origin's /api/send proxy too.
  if (!ENV_SCRIPT_URL) script.dataset.hostUrl = location.origin;
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
