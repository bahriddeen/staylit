# StayLit

A fast, static, **client-only** web app that keeps your screen awake — with a
timer-based **Awake** mode, two full-screen clocks (**Digital** and **Flip**),
and a **Timer** (countdown/interval/bell + stopwatch), all behind one mode
switcher. No backend, no accounts; deployable to any static host (Vercel /
Netlify / Cloudflare Pages).

## Features

- **Awake mode** — keep the screen on indefinitely or for a set duration, with an
  accurate absolute-timestamp countdown and a "timer finished" toast.
- **Digital clock** — seven-segment (DSEG7) and minimal themes, ghost segments,
  blinking colon, 12/24H, optional date line.
- **Flip clock** — animated 4-leaf flip cards (Web Animations API), ten themes.
- **Timer** — Countdown (Simple, Interval work/rest rounds, or a periodic Bell)
  and Stopwatch (with optional centiseconds), a synthesized alarm beep (Web
  Audio, no asset), and automatic wake-lock while running.
- **Shared wake lock** — one app-wide lock: turn it on anywhere and it stays on
  across modes; a timed session keeps counting down in the background (shown as a
  badge on the switcher) and finishes even while a clock is on screen.
- **Instant mode switcher** (top-left) with a sliding thumb, keyboard support
  (arrow keys + `1`–`4`), and a cross-fading background; mode-specific action
  icons (settings/wake/fullscreen) sit independently top-right.
- **Privacy / Terms / Contact** pages, linked from every page's footer.
- Lazy-loaded modes, per-route SEO (title / description / canonical / JSON-LD),
  History-API routing, dark/light theme, full keyboard access, and
  `prefers-reduced-motion` support.

## Stack

Vite + vanilla TypeScript (strict), plain CSS with custom properties, Vitest,
ESLint (flat config) + Prettier. Self-hosted fonts, no external requests.

## Getting started

```bash
npm install
npm run dev        # dev server
npm run build      # typecheck + production build → dist/
npm run preview    # preview the production build
npm test           # unit + integration tests (Vitest)
npm run lint       # eslint
npm run format     # prettier --write
```

## Routing & deploy

Client-side routing (History API): `/` → Awake, `/clock` → Digital, `/flip` →
Flip, `/timer` → Timer, plus `/privacy`, `/terms`, `/contact`. Each mode is a
dynamic `import()` so the initial bundle only contains the shell + the active
mode.

Static hosts must rewrite unknown paths to `/index.html` so deep links work.
Provided out of the box:

- **Netlify / Cloudflare Pages** — `public/_redirects` (`/* /index.html 200`)
- **Vercel** — `vercel.json` (rewrites all paths to `/index.html`)

For any other host, add an equivalent SPA fallback. Build output is `dist/`.

## Project structure

```
src/
  app/
    session.ts    app-wide wake lock + background countdown (shared by all modes)
    switcher.ts   toolbar: mode switcher pill (top-left) + action-icon slot (top-right)
    seo.ts        per-route <title>/description/canonical/OG/JSON-LD
    app.css       shell: cross-fade bg layer + switcher styles
  core/           wakeLock, fullscreen, storage, ticker, i18n (+ silent video)
  modes/
    awake/        Awake mode (hero, durations, sections)
    clock/        Clock mode (digital + flip views, settings, templates, drawer)
    timer/        Timer mode (countdown/interval/bell + stopwatch engine, drawer)
  pages/
    legal.ts      Privacy / Terms / Contact static pages
  ui/             icons, toggle, segmented, modal, toast, numberField, modeActions,
                  settingsField, siteFooter
  styles/         tokens.css, base.css, content.css (shared section/footer primitives)
  main.ts         entry: router, lazy mode loading, shortcuts, shared session
index.html
```

## Adding a new clock template

Templates are data-driven — one array entry plus (for flip) nothing else, since
styles come from CSS variables. Both view lists live in
`src/modes/clock/templates.ts`.

### Digital

Add one entry to `DIGITAL_TEMPLATES`:

```ts
digital(
  "digital-cyan",              // id (stored in settings)
  "Digital Cyan",             // display name
  "#001014",                  // --clock-bg
  "#22e0ff",                  // --clock-fg
  "0 0 18px rgba(34,224,255,.55)", // --clock-glow ("none" for no glow)
  '"DSEG7 Classic", monospace',    // --clock-font (or var(--font-ui))
  "700",                      // --clock-weight
  true,                        // seg? (renders ghost 88:88:88 + seg font)
),
```

### Flip

Add one entry to `FLIP_TEMPLATES`:

```ts
flip(
  "teal",                     // id
  "Teal",                    // name
  "#04140f",                  // --page-bg (also the cross-fade color)
  "#0f3d34",                  // --card-bg
  "#bdf5e6",                  // --card-fg
  "rgba(0,0,0,.45)",          // --split (hinge/line color)
  false,                       // soft shadow? (true for light themes)
),
```

That's it — the settings drawer renders a live preview tile automatically, the
value persists per view, and the background cross-fades to the new color. No new
CSS is required; if you want a bespoke look beyond the variables, add a scoped
block keyed on `.digital[data-template="your-id"]` (or `.flip[...]`) in
`src/modes/clock/clock.css`.

## Analytics

Cookieless analytics via [Umami](https://umami.is). It is on only when the
site is served from `staylit.live` (the site ID is in `src/core/analytics.ts`),
so local dev, preview deploys and forks send nothing. Set
`VITE_UMAMI_WEBSITE_ID` at build time to report to a different Umami site on
any host. It counts page views plus a `wake-on` event (with `timed:
true|false`) each time keep-awake is turned on. The script and its beacon are served
same-origin (`/s/l.js` and `/api/send`, proxied to Umami Cloud by `nginx.conf`
and `vercel.json`) so privacy blockers don't drop the anonymous counts. Set
`VITE_UMAMI_SCRIPT_URL` to load a self-hosted Umami instance directly instead.

## Fonts

Self-hosted, no external requests: **Inter** (UI), **DSEG7 Classic** (OFL —
seven-segment templates, vendored from the `dseg` package into
`src/assets/fonts/` with its license), **Oswald** (flip cards), and **Space
Mono** (the Classic digital template). Only the subsets a page needs are
downloaded (`unicode-range`).

## Notes

- **Canonical / OG URLs** point at `https://staylit.live/` (`index.html`,
  `public/robots.txt`, `public/sitemap.xml`, `scripts/prerender.mjs`) — update
  all four if the domain ever changes.
- **`og.png`** is a branded gradient; swap `public/og.png` for a designed
  1200×630 image when you have one.
- **Wake Lock fallback:** older iOS Safari lacks the Screen Wake Lock API, so the
  app falls back to a tiny muted inline video (`src/core/silentVideo.ts`).
