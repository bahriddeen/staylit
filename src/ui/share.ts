/**
 * Helpers for building and copying shareable deep-links. A share URL is the
 * current origin + the mode's path + the serialized settings as query params.
 */

/** Build an absolute URL for `path` (e.g. "/timer") carrying `params`. */
export function buildShareUrl(path: string, params: URLSearchParams): string {
  const url = new URL(path, window.location.origin);
  url.search = params.toString();
  return url.toString();
}

/** Copy text to the clipboard. Resolves false if the API is unavailable. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
