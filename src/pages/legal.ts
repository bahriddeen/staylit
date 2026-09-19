/**
 * Legal / info pages: Privacy, Terms, and Contact. Lightweight static content
 * reusing the shared content-page primitives (.awake, .section, .prose from
 * src/styles/content.css, loaded globally) so they read as part of the same
 * site rather than a bolted-on subpage.
 */

import "./legal.css";

import { t, tRaw } from "../core/i18n";
import { icons } from "../ui/icons";
import { createSiteFooter } from "../ui/siteFooter";

const CONTACT_LINK_TEXT = "Contact page";

export type LegalPage = "privacy" | "terms" | "contact" | "changelog";

export interface LegalPageMount {
  destroy(): void;
}

interface LegalSection {
  title: string;
  body: string;
}

interface ChangelogEntry {
  date: string;
  title: string;
  changes: string[];
}

function backLink(): HTMLElement {
  const a = document.createElement("a");
  a.className = "legal-back";
  a.href = "/";
  a.dataset.link = "";
  const icon = document.createElement("span");
  icon.innerHTML = icons.arrowRight;
  icon.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.textContent = t("common.back");
  a.append(icon, label);
  return a;
}

function heading(page: LegalPage): HTMLElement {
  const h1 = document.createElement("h1");
  h1.className = "section__title";
  h1.textContent = t(`legal.${page}.heading`);
  return h1;
}

function intro(page: LegalPage): HTMLElement {
  const p = document.createElement("p");
  p.className = "section__subtitle";
  p.textContent = t(`legal.${page}.intro`);
  return p;
}

/** Render body text, turning a literal "Contact page" mention into a real link. */
function renderBody(p: HTMLElement, text: string): void {
  const idx = text.indexOf(CONTACT_LINK_TEXT);
  if (idx === -1) {
    p.textContent = text;
    return;
  }
  p.append(text.slice(0, idx));
  const link = document.createElement("a");
  link.href = "/contact";
  link.dataset.link = "";
  link.textContent = CONTACT_LINK_TEXT;
  p.append(link, text.slice(idx + CONTACT_LINK_TEXT.length));
}

function sectionsFor(page: "privacy" | "terms"): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "section";
  for (const s of tRaw<LegalSection[]>(`legal.${page}.sections`)) {
    const block = document.createElement("div");
    block.className = "legal-section";
    const h2 = document.createElement("h2");
    h2.className = "legal-section__title";
    h2.textContent = s.title;
    const p = document.createElement("p");
    p.className = "legal-section__body";
    renderBody(p, s.body);
    block.append(h2, p);
    wrap.appendChild(block);
  }
  return wrap;
}

function contactCard(icon: string, content: HTMLElement[]): HTMLElement {
  const card = document.createElement("div");
  card.className = "legal-contact__card";
  const badge = document.createElement("span");
  badge.className = "legal-contact__icon";
  badge.setAttribute("aria-hidden", "true");
  badge.innerHTML = icon;
  const text = document.createElement("div");
  text.className = "legal-contact__text";
  text.append(...content);
  card.append(badge, text);
  return card;
}

function contactContent(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "section legal-contact";

  const emailLabel = document.createElement("span");
  emailLabel.className = "legal-contact__label";
  emailLabel.textContent = t("legal.contact.emailLabel");
  const email = t("legal.contact.email");
  const emailLink = document.createElement("a");
  emailLink.className = "legal-contact__value";
  emailLink.href = `mailto:${email}`;
  emailLink.textContent = email;
  const emailCard = contactCard(icons.mail, [emailLabel, emailLink]);

  const supportLabel = document.createElement("span");
  supportLabel.className = "legal-contact__label";
  supportLabel.textContent = t("legal.contact.supportLabel");
  const supportBody = document.createElement("p");
  supportBody.className = "legal-contact__support";
  supportBody.textContent = t("legal.contact.supportBody");
  const supportCta = document.createElement("a");
  supportCta.className = "button button--primary legal-contact__cta";
  supportCta.href = "https://buymeacoffee.com/mbahriddin";
  supportCta.target = "_blank";
  supportCta.rel = "noopener noreferrer";
  supportCta.textContent = t("legal.contact.supportCta");
  const supportCard = contactCard(icons.heart, [
    supportLabel,
    supportBody,
    supportCta,
  ]);

  wrap.append(emailCard, supportCard);
  return wrap;
}

function changelogContent(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "section legal-changelog";

  for (const entry of tRaw<ChangelogEntry[]>("legal.changelog.entries")) {
    const item = document.createElement("article");
    item.className = "changelog-entry";

    const head = document.createElement("div");
    head.className = "changelog-entry__head";
    const title = document.createElement("h2");
    title.className = "changelog-entry__title";
    title.textContent = entry.title;
    const date = document.createElement("span");
    date.className = "changelog-entry__date";
    date.textContent = entry.date;
    head.append(title, date);

    const list = document.createElement("ul");
    list.className = "changelog-entry__list";
    for (const change of entry.changes) {
      const li = document.createElement("li");
      li.textContent = change;
      list.appendChild(li);
    }

    item.append(head, list);
    wrap.appendChild(item);
  }
  return wrap;
}

export function mountLegalPage(
  root: HTMLElement,
  page: LegalPage,
): LegalPageMount {
  const wrapper = document.createElement("div");
  wrapper.className = "awake legal-page";

  const content =
    page === "contact"
      ? contactContent()
      : page === "changelog"
        ? changelogContent()
        : sectionsFor(page);

  wrapper.append(
    backLink(),
    heading(page),
    intro(page),
    content,
    createSiteFooter(),
  );
  root.append(wrapper);

  return {
    destroy() {
      wrapper.remove();
    },
  };
}
