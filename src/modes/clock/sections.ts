/**
 * Below-the-fold content for the clock pages (hidden in fullscreen): an intro,
 * "Great for" cards, how-to steps, an FAQ accordion, and the footer. Copy is
 * per-view via i18n so /clock and /flip read distinctly for SEO.
 */

import { t, tRaw } from "../../core/i18n";
import { icons, type IconName } from "../../ui/icons";
import { createSiteFooter } from "../../ui/siteFooter";
import type { ClockView } from "./settings";

interface IconItem {
  icon: string;
  title: string;
  description: string;
}
interface StepItem {
  title: string;
  description: string;
}
interface FaqItem {
  question: string;
  answer: string;
}

function iconFor(name: string): IconName {
  return name in icons ? (name as IconName) : "clock";
}

function h(level: "h1" | "h2" | "h3", text: string, cls: string): HTMLElement {
  const el = document.createElement(level);
  el.className = cls;
  el.textContent = text;
  return el;
}

function introSection(view: ClockView): HTMLElement {
  const section = document.createElement("section");
  section.className = "section prose";
  section.append(
    h("h1", t(`clock.${view}.heading`), "section__title"),
    (() => {
      const p = document.createElement("p");
      p.textContent = t(`clock.${view}.intro`);
      return p;
    })(),
  );
  return section;
}

function useCasesSection(): HTMLElement {
  const section = document.createElement("section");
  section.className = "section";
  section.append(
    h("h2", t("clock.sections.useCases.heading"), "section__title"),
  );
  const grid = document.createElement("div");
  grid.className = "feature-grid feature-grid--3";
  for (const item of tRaw<IconItem[]>("clock.sections.useCases.items")) {
    const cell = document.createElement("div");
    cell.className = "feature";
    const head = document.createElement("div");
    head.className = "feature__head";
    const badge = document.createElement("span");
    badge.className = "icon-badge";
    badge.setAttribute("aria-hidden", "true");
    badge.innerHTML = icons[iconFor(item.icon)];
    head.append(badge, h("h3", item.title, "feature__title"));
    const desc = document.createElement("p");
    desc.className = "feature__desc";
    desc.textContent = item.description;
    cell.append(head, desc);
    grid.appendChild(cell);
  }
  section.appendChild(grid);
  return section;
}

function howSection(): HTMLElement {
  const section = document.createElement("section");
  section.className = "section";
  section.append(h("h2", t("clock.sections.how.heading"), "section__title"));
  const list = document.createElement("ol");
  list.className = "steps";
  tRaw<StepItem[]>("clock.sections.how.steps").forEach((step, i) => {
    const li = document.createElement("li");
    li.className = "steps__item";
    const num = document.createElement("span");
    num.className = "steps__num";
    num.setAttribute("aria-hidden", "true");
    num.textContent = String(i + 1);
    const content = document.createElement("div");
    content.append(
      h("h3", step.title, "steps__title"),
      (() => {
        const p = document.createElement("p");
        p.className = "steps__desc";
        p.textContent = step.description;
        return p;
      })(),
    );
    li.append(num, content);
    list.appendChild(li);
  });
  section.appendChild(list);
  return section;
}

function faqSection(): HTMLElement {
  const section = document.createElement("section");
  section.className = "section faq";
  section.append(h("h2", t("clock.sections.faq.heading"), "section__title"));
  for (const item of tRaw<FaqItem[]>("clock.sections.faq.items")) {
    const details = document.createElement("details");
    details.className = "faq__item";
    const summary = document.createElement("summary");
    summary.className = "faq__q";
    const q = document.createElement("span");
    q.textContent = item.question;
    const chevron = document.createElement("span");
    chevron.className = "faq__chevron";
    chevron.setAttribute("aria-hidden", "true");
    summary.append(q, chevron);
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

/** Build the below-fold content for a clock view. */
export function createClockSections(view: ClockView): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "clock-below";
  const inner = document.createElement("div");
  inner.className = "awake"; // reuse the centered content column
  inner.append(
    introSection(view),
    useCasesSection(),
    howSection(),
    faqSection(),
    createSiteFooter(),
  );
  wrap.appendChild(inner);
  return wrap;
}
