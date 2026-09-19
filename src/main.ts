/**
 * App entry + router.
 *
 * Routes (History API): "/" → Awake, "/clock" → Digital, "/flip" → Flip,
 * "/timer" → Timer. Each mode's module is lazy-loaded with dynamic import(), so
 * the initial bundle only contains the shell + the active mode. A single
 * AppSession (shared wake lock + background countdown) and the toolbar/switcher
 * live above the modes and persist across switches; the background cross-fades
 * on change.
 */

import "@fontsource-variable/inter";
// Optical-size axis of Fraunces — the soft display serif used for headings.
import "@fontsource-variable/fraunces/opsz.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/content.css";
import "./app/app.css";

import { createStorage } from "./core/storage";
import { t, tRaw, setLocale } from "./core/i18n";
import { icons } from "./ui/icons";
import { applySeo, type FaqEntry } from "./app/seo";
import { AppSession } from "./app/session";
import { createAppToolbar, type AppMode } from "./app/switcher";
import { formatHMS } from "./modes/awake/durations";
import type { AwakeMode } from "./modes/awake";
import type { ClockMode } from "./modes/clock";
import type { ClockView } from "./modes/clock/settings";
import type { TimerMode } from "./modes/timer";
import type { LegalPage, LegalPageMount } from "./pages/legal";

type Theme = "light" | "dark";

const AWAKE_TITLE = "Keep Your Screen On · Awake Clock";
const AWAKE_DESC =
  "Keep your screen awake in the browser. No install, no sign-up. Set a timer or keep your display on indefinitely for downloads, coding, AI sessions, and presentations.";

// ----- Theme -----

const themeStore = createStorage<Theme | null>("theme", null);

function currentTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function buildThemeButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "icon-button";
  btn.setAttribute("aria-label", t("theme.toggle"));
  const paint = (): void => {
    const theme = currentTheme();
    btn.innerHTML = theme === "light" ? icons.moon : icons.sun;
    btn.title = theme === "light" ? t("theme.dark") : t("theme.light");
  };
  paint();
  btn.addEventListener("click", () => {
    const next: Theme = currentTheme() === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    themeStore.set(next);
    paint();
  });
  return btn;
}

// ----- Language -----
//
// The selected locale is persisted and loaded before the shell renders (see the
// top-level await below), so every t() call resolves in the chosen language on
// first paint. Switching reloads the page: the toolbar, switcher, and each mode
// build their strings once at construction, so a reload is the simplest reliable
// way to re-render everything in the new locale.

const LANGUAGES: { value: string; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ru", label: "Russian" },
  { value: "uz", label: "Uzbek" },
  { value: "ar", label: "Arabic" },
  { value: "ja", label: "Japanese" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Português" },
  { value: "ko", label: "한국어" },
  { value: "zh", label: "中文" },
];

const languageStore = createStorage<string>("language", "en");

function buildLanguageSelect(): HTMLSelectElement {
  const select = document.createElement("select");
  select.className = "language-select";
  select.setAttribute("aria-label", "Language");
  for (const { value, label } of LANGUAGES) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }
  select.value = languageStore.get();
  select.addEventListener("change", () => {
    languageStore.set(select.value);
    // Rebuild the whole app in the new locale (strings are read at build time).
    location.reload();
  });
  return select;
}

// Load the persisted locale before anything reads strings. English is bundled
// synchronously, so this only awaits for non-default locales.
await setLocale(languageStore.get());
document.documentElement.lang = languageStore.get();
document.documentElement.dir = languageStore.get() === "ar" ? "rtl" : "ltr";

// ----- Shell -----

const appEl = document.getElementById("app");
if (!appEl) throw new Error("#app root not found");

const bgLayer = document.createElement("div");
bgLayer.className = "app-bg";
document.body.prepend(bgLayer);

function setBackground(color: string): void {
  bgLayer.style.backgroundColor = color; // "" falls back to var(--bg)
}

const content = document.createElement("div");
content.className = "app-content";
appEl.append(content);

const session = new AppSession();
const themeButton = buildThemeButton();
const languageSelect = buildLanguageSelect();

// ----- Routing -----

const APP_MODES: AppMode[] = ["awake", "digital", "flip", "timer"];

function pathToAppMode(path: string): AppMode {
  if (path === "/clock") return "digital";
  if (path === "/flip") return "flip";
  if (path === "/timer") return "timer";
  return "awake";
}

function pathForAppMode(mode: AppMode): string {
  switch (mode) {
    case "digital":
      return "/clock";
    case "flip":
      return "/flip";
    case "timer":
      return "/timer";
    default:
      return "/";
  }
}

const toolbar = createAppToolbar(pathToAppMode(location.pathname), {
  onSelect: (mode) => navigate(pathForAppMode(mode)),
});
document.body.append(toolbar.element);

// Awake countdown badge on the switcher (works from any mode).
session.onChange((s) => {
  toolbar.setBadge(s.timed && s.wake.wanted ? formatHMS(s.remainingMs) : null);
});

const LEGAL_PAGES: LegalPage[] = ["privacy", "terms", "contact"];

function legalPageFor(path: string): LegalPage | null {
  const slug = path.slice(1);
  return (LEGAL_PAGES as string[]).includes(slug) ? (slug as LegalPage) : null;
}

let currentMode: "awake" | "clock" | "timer" | "legal" | null = null;
let awakeMode: AwakeMode | null = null;
let clockMode: ClockMode | null = null;
let timerMode: TimerMode | null = null;
let legalMode: LegalPageMount | null = null;
let currentLegalPage: LegalPage | null = null;
let navToken = 0;

function teardown(): void {
  awakeMode?.destroy();
  awakeMode = null;
  clockMode?.destroy();
  clockMode = null;
  timerMode?.destroy();
  timerMode = null;
  legalMode?.destroy();
  legalMode = null;
  currentLegalPage = null;
  content.textContent = "";
  currentMode = null;
}

function applyAwakeSeo(): void {
  applySeo({
    title: AWAKE_TITLE,
    description: AWAKE_DESC,
    path: "/",
    faq: tRaw<FaqEntry[]>("awake.faq.items"),
  });
}

function applyLegalSeo(page: LegalPage): void {
  applySeo({
    title: t(`legal.${page}.seo.title`),
    description: t(`legal.${page}.seo.description`),
    path: `/${page}`,
    faq: [],
  });
}

async function renderRoute(path: string): Promise<void> {
  const token = ++navToken;

  const legalPage = legalPageFor(path);
  if (legalPage) {
    // Legal pages are part of the main app shell; leave the Awake tab active.
    toolbar.setActiveMode("awake");
    if (currentMode !== "legal" || currentLegalPage !== legalPage) {
      teardown();
      const { mountLegalPage } = await import("./pages/legal");
      if (token !== navToken) return;
      legalMode = mountLegalPage(content, legalPage);
      currentMode = "legal";
      currentLegalPage = legalPage;
    }
    toolbar.setActions([themeButton]);
    setBackground("");
    applyLegalSeo(legalPage);
    return;
  }

  const appMode = pathToAppMode(path);
  toolbar.setActiveMode(appMode);

  if (appMode === "awake") {
    if (currentMode !== "awake") {
      teardown();
      const { mountAwakeMode } = await import("./modes/awake");
      if (token !== navToken) return; // superseded by a newer navigation
      awakeMode = mountAwakeMode(content, session);
      currentMode = "awake";
    }
    toolbar.setActions([languageSelect, themeButton]);
    setBackground(""); // → var(--bg)
    applyAwakeSeo();
  } else if (appMode === "timer") {
    if (currentMode !== "timer") {
      teardown();
      const { mountTimerMode } = await import("./modes/timer");
      if (token !== navToken) return;
      timerMode = mountTimerMode(content, { session, toolbar, setBackground });
      currentMode = "timer";
    }
  } else {
    const view = appMode as ClockView;
    if (currentMode === "clock" && clockMode) {
      clockMode.setView(view);
    } else {
      teardown();
      const { mountClockMode } = await import("./modes/clock");
      if (token !== navToken) return;
      clockMode = mountClockMode(content, view, {
        session,
        toolbar,
        setBackground,
      });
      currentMode = "clock";
    }
  }
}

function navigate(path: string): void {
  if (path !== location.pathname) history.pushState({}, "", path);
  void renderRoute(path);
}

window.addEventListener("popstate", () => void renderRoute(location.pathname));

document.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
  const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>(
    "a[data-link]",
  );
  if (!anchor) return;
  const href = anchor.getAttribute("href");
  if (!href || !href.startsWith("/")) return;
  e.preventDefault();
  navigate(href);
});

// Number-key shortcuts: 1 → Awake, 2 → Digital, 3 → Flip, 4 → Timer.
document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const el = e.target as HTMLElement | null;
  if (
    el &&
    (el.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))
  ) {
    return;
  }
  const index = ["1", "2", "3", "4"].indexOf(e.key);
  if (index === -1) return;
  navigate(pathForAppMode(APP_MODES[index]!));
});

void renderRoute(location.pathname);
