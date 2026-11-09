import { getMarketingContactHref, getMarketingWhatsAppHref } from "@/lib/marketing-contact";

import ButtonLink from "./ButtonLink";

// The closing call to action on marketing pages (the Portfolio style): a
// contact button and a WhatsApp chat whose first message suits the page.
export default function CtaBand({
  eyebrow = "Start A Project",
  title = "Have a project in mind?",
  text = "Tell us what you want to build or grow. We usually reply within 24 hours.",
  primaryLabel = "Start A Project",
  primaryHref = getMarketingContactHref(),
  whatsappPath = "/",
}) {
  return (
    <section className="bg-black px-[var(--site-gutter)] py-16 text-white sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[var(--site-content)] border-t border-white/15 pt-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="m-0 font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">{eyebrow}</p>
            <h2 className="mt-4 max-w-4xl text-4xl font-bold uppercase leading-[0.95] sm:text-5xl lg:text-7xl">{title}</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-gray-300 sm:text-lg">{text}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <ButtonLink href={primaryHref} variant="light" arrow className="min-h-14 px-7 py-4">
              {primaryLabel}
            </ButtonLink>
            <ButtonLink href={getMarketingWhatsAppHref(whatsappPath)} variant="secondary" external className="min-h-14 px-7 py-4">
              Chat On WhatsApp
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
