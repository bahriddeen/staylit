/**
 * First-visit mobile guide. Shows a 3-step modal the first time a touch user
 * opens the clock, then records that it has been seen so it never nags again.
 */

import { t } from "../../core/i18n";
import { createModal } from "../../ui/modal";
import { createStorage } from "../../core/storage";

const seenStore = createStorage<boolean>("clock.guideSeen", false);

function isMobile(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 640px)").matches
  );
}

export function showGuideIfFirstMobileVisit(): void {
  if (seenStore.get() || !isMobile()) return;

  const list = document.createElement("ol");
  list.className = "guide__steps";
  for (const key of ["step1", "step2", "step3"] as const) {
    const li = document.createElement("li");
    li.className = "guide__step";
    const num = document.createElement("span");
    num.className = "guide__num";
    num.setAttribute("aria-hidden", "true");
    num.textContent = String(list.childElementCount + 1);
    const text = document.createElement("span");
    text.textContent = t(`clock.guide.${key}`);
    li.append(num, text);
    list.appendChild(li);
  }

  const footer = document.createElement("div");
  footer.className = "guide__footer";
  const gotIt = document.createElement("button");
  gotIt.type = "button";
  gotIt.className = "button button--primary";
  gotIt.textContent = t("clock.guide.gotIt");
  footer.appendChild(gotIt);

  const content = document.createElement("div");
  content.append(list, footer);

  const modal = createModal({
    title: t("clock.guide.title"),
    content,
    variant: "modal",
    closeLabel: t("common.close"),
    onClose: () => {
      seenStore.set(true);
      modal.destroy();
    },
  });
  document.body.appendChild(modal.element);
  gotIt.addEventListener("click", () => modal.close());
  modal.open();
}
