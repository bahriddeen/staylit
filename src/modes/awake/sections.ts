/**
 * Static content sections for Awake mode: "More ways", What/Why/Use cases/How,
 * FAQ accordion, and the footer. All copy comes from i18n; structure is
 * semantic (section/h2/h3, details/summary) for accessibility and SEO.
 */

import { t } from "../../core/i18n";
import { icons } from "../../ui/icons";
import { createSiteFooter } from "../../ui/siteFooter";
import {
  benefits,
  useCases,
  steps,
  faqs,
  moreWaysCards,
  type IconItem,
} from "./content";

function iconBadge(name: keyof typeof icons): HTMLElement {
  const el = document.createElement("span");
  el.className = "icon-badge";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = icons[name];
  return el;
}

function heading(
  level: "h2" | "h3",
  text: string,
  className: string,
): HTMLElement {
  const el = document.createElement(level);
  el.className = className;
  el.textContent = text;
  return el;
}

function moreWaysSection(): HTMLElement {
  const section = document.createElement("section");
  section.className = "section more-ways";
  section.setAttribute("aria-labelledby", "more-ways-heading");

  const head = heading("h2", t("awake.moreWays.heading"), "section__title");
  head.id = "more-ways-heading";
  const sub = document.createElement("p");
  sub.className = "section__subtitle";
  sub.textContent = t("awake.moreWays.subtitle");

  const grid = document.createElement("div");
  grid.className = "card-grid";

  for (const card of moreWaysCards()) {
    const article = document.createElement("article");
    article.className = "info-card";

    const media = document.createElement("div");
    media.className = "info-card__media";
    media.innerHTML = card.art;
    if (card.badge) {
      const badge = document.createElement("span");
      badge.className = "info-card__badge";
      badge.textContent = card.badge;
      media.appendChild(badge);
    }

    const body = document.createElement("div");
    body.className = "info-card__body";

    const title = heading("h3", card.title, "info-card__title");
    const desc = document.createElement("p");
    desc.className = "info-card__desc";
    desc.textContent = card.description;

    const link = document.createElement("a");
    link.className = "button button--primary info-card__cta";
    link.href = card.href;
    link.dataset.mode = card.key;
    if (card.href.startsWith("/")) link.dataset.link = ""; // SPA-routed
    link.append(card.cta);
    if (card.key === "extension") {
      const bell = document.createElement("span");
      bell.className = "button__icon";
      bell.setAttribute("aria-hidden", "true");
      bell.innerHTML = icons.bell;
      link.appendChild(bell);
    }

    body.append(title, desc, link);
    article.append(media, body);
    grid.appendChild(article);
  }

  section.append(head, sub, grid);
  return section;
}

function whatSection(): HTMLElement {
  const section = document.createElement("section");
  section.className = "section prose";
  section.setAttribute("aria-labelledby", "what-heading");
  const head = heading("h2", t("awake.what.heading"), "section__title");
  head.id = "what-heading";
  const body = document.createElement("p");
  body.textContent = t("awake.what.body");
  section.append(head, body);
  return section;
}

function iconGrid(items: IconItem[], className: string): HTMLElement {
  const grid = document.createElement("div");
  grid.className = className;
  for (const item of items) {
    const cell = document.createElement("div");
    cell.className = "feature";
    const title = document.createElement("div");
    title.className = "feature__head";
    title.append(iconBadge(item.icon));
    const h = heading("h3", item.title, "feature__title");
    title.appendChild(h);
    const desc = document.createElement("p");
    desc.className = "feature__desc";
    desc.textContent = item.description;
    cell.append(title, desc);
    grid.appendChild(cell);
  }
  return grid;
}

function whySection(): HTMLElement {
  const section = document.createElement("section");
  section.className = "section";
  section.setAttribute("aria-labelledby", "why-heading");
  const head = heading("h2", t("awake.why.heading"), "section__title");
  head.id = "why-heading";
  section.append(head, iconGrid(benefits(), "feature-grid feature-grid--3"));
  return section;
}

function useCasesSection(): HTMLElement {
  const section = document.createElement("section");
  section.className = "section";
  section.setAttribute("aria-labelledby", "use-cases-heading");
  const head = heading("h2", t("awake.useCases.heading"), "section__title");
  head.id = "use-cases-heading";
  section.append(head, iconGrid(useCases(), "feature-grid feature-grid--3"));
  return section;
}

function howSection(): HTMLElement {
  const section = document.createElement("section");
  section.className = "section";
  section.setAttribute("aria-labelledby", "how-heading");
  const head = heading("h2", t("awake.how.heading"), "section__title");
  head.id = "how-heading";

  const list = document.createElement("ol");
  list.className = "steps";
  steps().forEach((step, i) => {
    const li = document.createElement("li");
    li.className = "steps__item";
    const num = document.createElement("span");
    num.className = "steps__num";
    num.setAttribute("aria-hidden", "true");
    num.textContent = String(i + 1);
    const content = document.createElement("div");
    const h = heading("h3", step.title, "steps__title");
    const desc = document.createElement("p");
    desc.className = "steps__desc";
    desc.textContent = step.description;
    content.append(h, desc);
    li.append(num, content);
    list.appendChild(li);
  });

  section.append(head, list);
  return section;
}

function faqSection(): HTMLElement {
  const section = document.createElement("section");
  section.className = "section faq";
  section.setAttribute("aria-labelledby", "faq-heading");
  const head = heading("h2", t("awake.faq.heading"), "section__title");
  head.id = "faq-heading";
  section.appendChild(head);

  for (const item of faqs()) {
    const details = document.createElement("details");
    details.className = "faq__item";
    const summary = document.createElement("summary");
    summary.className = "faq__q";
    const qtext = document.createElement("span");
    qtext.textContent = item.question;
    const chevron = document.createElement("span");
    chevron.className = "faq__chevron";
    chevron.setAttribute("aria-hidden", "true");
    summary.append(qtext, chevron);
    const answer = document.createElement("div");
    answer.className = "faq__a";
    const p = document.createElement("p");
    p.textContent = item.answer;
    answer.appendChild(p);
    details.append(summary, answer);
    section.appendChild(details);
  }
  return section;
}

/** Build all static content sections below the hero, in order. */
export function createSections(): DocumentFragment {
  const frag = document.createDocumentFragment();
  frag.append(
    moreWaysSection(),
    whatSection(),
    whySection(),
    useCasesSection(),
    howSection(),
    faqSection(),
    createSiteFooter(),
  );
  return frag;
}
