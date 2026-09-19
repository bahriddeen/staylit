/**
 * Shared site footer used at the bottom of every page (Awake, Digital, Flip,
 * Timer, and the legal pages). Links are real client-side routes (data-link),
 * so main.ts's click interceptor handles navigation without a reload.
 */

import { t } from "../core/i18n";

export function createSiteFooter(): HTMLElement {
  const el = document.createElement("footer");
  el.className = "site-footer";

  const nav = document.createElement("nav");
  nav.className = "site-footer__links";
  nav.setAttribute("aria-label", "Footer");

  const links: Array<[string, string, boolean]> = [
    [t("awake.footer.privacy"), "/privacy", true],
    [t("awake.footer.terms"), "/terms", true],
    [t("awake.footer.contact"), "/contact", true],
    [t("awake.footer.changelog"), "/changelog", true],
  ];
  for (const [label, href, isRoute] of links) {
    const a = document.createElement("a");
    a.href = href;
    if (isRoute) a.dataset.link = "";
    a.textContent = label;
    nav.appendChild(a);
  }

  const copy = document.createElement("p");
  copy.className = "site-footer__copy";
  copy.textContent = `© ${new Date().getFullYear()} ${t("app.title")}. ${t("awake.footer.rights")}`;

  el.append(nav, copy);
  return el;
}
