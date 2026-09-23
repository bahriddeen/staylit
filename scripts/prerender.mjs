/**
 * Per-route SEO prerender for the Vite SPA. Runs after `vite build`.
 *
 * The app is client-rendered, so a crawler that doesn't execute JS would see
 * the same generic <head> on every deep link. This step writes a static
 * dist/<route>/index.html for each known route with the correct <title>, meta
 * description, canonical, Open Graph / Twitter tags, and FAQPage JSON-LD —
 * so search engines and social scrapers get accurate metadata without running
 * JS. The body stays the SPA shell; the JS boots and renders as usual.
 *
 * All copy comes from src/locales/en.json (the same source the runtime uses),
 * so metadata can't drift from the app.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

// Must match index.html, robots.txt, and sitemap.xml.
const ORIGIN = "https://staylit.live";

const en = JSON.parse(
  await readFile(join(root, "src/locales/en.json"), "utf8"),
);

const AWAKE_DESC =
  "Keep your screen awake in the browser. No install, no sign-up. Set a timer or keep your display on indefinitely for downloads, coding, AI sessions, and presentations.";

const routes = [
  {
    path: "/",
    title: "Keep Your Screen On · StayLit",
    desc: AWAKE_DESC,
    faq: en.awake.faq.items,
  },
  {
    path: "/clock",
    title: en.clock.digital.seo.title,
    desc: en.clock.digital.seo.description,
    faq: en.clock.sections.faq.items,
  },
  {
    path: "/flip",
    title: en.clock.flip.seo.title,
    desc: en.clock.flip.seo.description,
    faq: en.clock.sections.faq.items,
  },
  {
    path: "/timer",
    title: en.timer.seo.title,
    desc: en.timer.seo.description,
    faq: en.timer.sections.faq.items,
  },
  {
    path: "/privacy",
    title: en.legal.privacy.seo.title,
    desc: en.legal.privacy.seo.description,
    faq: [],
  },
  {
    path: "/terms",
    title: en.legal.terms.seo.title,
    desc: en.legal.terms.seo.description,
    faq: [],
  },
  {
    path: "/contact",
    title: en.legal.contact.seo.title,
    desc: en.legal.contact.seo.description,
    faq: [],
  },
  {
    path: "/changelog",
    title: en.legal.changelog.seo.title,
    desc: en.legal.changelog.seo.description,
    faq: [],
  },
];

const esc = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const faqLd = (faq) =>
  JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  });

const base = await readFile(join(dist, "index.html"), "utf8");

function render(route) {
  const url = ORIGIN + route.path;
  let html = base;

  html = html.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${esc(route.title)}</title>`,
  );
  html = html.replace(
    /(<meta\s+name="description"\s+content=")[\s\S]*?("\s*\/>)/,
    `$1${esc(route.desc)}$2`,
  );
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
  html = html.replace(
    /(<meta property="og:title" content=")[^"]*(")/,
    `$1${esc(route.title)}$2`,
  );
  html = html.replace(
    /(<meta\s+property="og:description"\s+content=")[\s\S]*?(")/,
    `$1${esc(route.desc)}$2`,
  );
  html = html.replace(
    /(<meta property="og:url" content=")[^"]*(")/,
    `$1${url}$2`,
  );
  html = html.replace(
    /(<meta name="twitter:title" content=")[^"]*(")/,
    `$1${esc(route.title)}$2`,
  );
  html = html.replace(
    /(<meta\s+name="twitter:description"\s+content=")[\s\S]*?(")/,
    `$1${esc(route.desc)}$2`,
  );

  // FAQPage JSON-LD: fill for routes with FAQs, drop the block otherwise.
  if (route.faq.length > 0) {
    html = html.replace(
      /(<script type="application\/ld\+json" id="ld-faq">)[\s\S]*?(<\/script>)/,
      `$1${faqLd(route.faq)}$2`,
    );
  } else {
    html = html.replace(
      /\s*<script type="application\/ld\+json" id="ld-faq">[\s\S]*?<\/script>/,
      "",
    );
  }
  return html;
}

for (const route of routes) {
  const html = render(route);
  if (route.path === "/") {
    await writeFile(join(dist, "index.html"), html);
  } else {
    const dir = join(dist, route.path.slice(1));
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), html);
  }
  console.log(`prerendered ${route.path}`);
}
