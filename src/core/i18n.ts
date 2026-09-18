/**
 * Tiny JSON-based translation loader.
 *
 * Locales live in ../locales/*.json. English is bundled eagerly so first paint
 * has strings synchronously (no flash of untranslated content); other locales
 * can be added by dropping a JSON file in and are lazy-loaded on demand.
 *
 * t("some.key", { name: "x" }) resolves dotted keys and interpolates {param}
 * placeholders. Unknown keys return the key itself so missing strings are
 * visible rather than blank.
 */

export type Messages = Record<string, unknown>;
export type TranslateParams = Record<string, string | number>;

// Eagerly bundle English for synchronous first render.
import en from "../locales/en.json";

// Lazily importable locale modules, keyed by code (e.g. "es", "fr", "ru", "ar",
// "ja", "de", "it", "pt", "ko", "zh", "uz"). English is excluded because it is
// bundled eagerly above. Adding a new src/locales/<code>.json makes that code
// available automatically (see availableLocales).
const lazyLocales = import.meta.glob<{ default: Messages }>([
  "../locales/*.json",
  "!../locales/en.json",
]);

const DEFAULT_LOCALE = "en";
const loaded: Record<string, Messages> = { en: en as Messages };

let current = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

function resolve(messages: Messages, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Messages)) {
      return (acc as Messages)[part];
    }
    return undefined;
  }, messages);
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Current active locale code. */
export function getLocale(): string {
  return current;
}

/** List locale codes that have a JSON file available (default locale included). */
export function availableLocales(): string[] {
  const lazy = Object.keys(lazyLocales)
    .map((path) => path.match(/\/([^/]+)\.json$/)?.[1])
    .filter((code): code is string => Boolean(code));
  return [DEFAULT_LOCALE, ...lazy];
}

/**
 * Load and switch to a locale. Falls back to the default locale if the file is
 * missing or fails to parse. Notifies subscribers on success.
 */
export async function setLocale(code: string): Promise<void> {
  if (!loaded[code]) {
    const path = `../locales/${code}.json`;
    const loader = lazyLocales[path];
    if (!loader) {
      current = DEFAULT_LOCALE;
      notify();
      return;
    }
    try {
      const mod = await loader();
      loaded[code] = mod.default;
    } catch {
      current = DEFAULT_LOCALE;
      notify();
      return;
    }
  }
  current = code;
  notify();
}

/** Translate a dotted key with optional {param} interpolation. */
export function t(key: string, params?: TranslateParams): string {
  const messages = loaded[current] ?? loaded[DEFAULT_LOCALE]!;
  let value = resolve(messages, key);
  if (typeof value !== "string") {
    // Fall back to default locale before giving up.
    value = resolve(loaded[DEFAULT_LOCALE]!, key);
  }
  return typeof value === "string" ? interpolate(value, params) : key;
}

/**
 * Resolve a key to its raw value (string, array, or object) for structured
 * content like benefit/FAQ lists. Falls back to the default locale, then to the
 * provided fallback (default: an empty array).
 */
export function tRaw<T = unknown>(key: string, fallback?: T): T {
  const messages = loaded[current] ?? loaded[DEFAULT_LOCALE]!;
  let value = resolve(messages, key);
  if (value === undefined) value = resolve(loaded[DEFAULT_LOCALE]!, key);
  if (value !== undefined) return value as T;
  return (fallback ?? ([] as unknown as T)) as T;
}

/** Subscribe to locale changes. Returns an unsubscribe function. */
export function onLocaleChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  for (const listener of listeners) listener();
}
