/**
 * Per-route SEO. Updates the document title, description, canonical + Open
 * Graph / Twitter URLs, and the FAQPage JSON-LD to match the active view.
 * Tags are created if missing so this works regardless of the static HTML.
 */

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface SeoConfig {
  title: string;
  description: string;
  /** Absolute path, e.g. "/clock". */
  path: string;
  faq: FaqEntry[];
}

function setMeta(
  attr: "name" | "property",
  key: string,
  content: string,
): void {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(url: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = url;
}

function setFaqJsonLd(faq: FaqEntry[]): void {
  let el = document.getElementById("ld-faq") as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = "ld-faq";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  });
}

export function applySeo(cfg: SeoConfig): void {
  const url = location.origin + cfg.path;
  document.title = cfg.title;
  setMeta("name", "description", cfg.description);
  setCanonical(url);
  setMeta("property", "og:title", cfg.title);
  setMeta("property", "og:description", cfg.description);
  setMeta("property", "og:url", url);
  setMeta("name", "twitter:title", cfg.title);
  setMeta("name", "twitter:description", cfg.description);
  setFaqJsonLd(cfg.faq);
}
