import Image from "next/image";

import { getMarketingContactHref, getMarketingWhatsAppHref } from "@/lib/marketing-contact";

import ButtonLink from "./ButtonLink";
import CircleButton from "./CircleButton";
import { Eyebrow, TwoToneTitle } from "./PageSection";

// The closing call to action on marketing pages: a two-tone heading, the
// round white contact button and a WhatsApp chat whose first message suits
// the page. With `image`, an illustration sits beside the text.
export default function CtaBand({
  eyebrow = "Start A Project",
  title,
  accent,
  text = "Tell us what you want to build or grow. We usually reply within 24 hours.",
  primaryLabel = "Start A Project",
  primaryHref = getMarketingContactHref(),
  whatsappPath = "/",
  image,
}) {
  // Without a title, the default heading reads "Have a project / in mind?".
  const heading = title ?? "Have a project";
  const headingAccent = title === undefined ? (accent ?? "in mind?") : accent;

  const buttons = (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-5">
      <CircleButton href={primaryHref}>{primaryLabel}</CircleButton>
      <ButtonLink href={getMarketingWhatsAppHref(whatsappPath)} variant="secondary" external className="min-h-14 px-7 py-4">
        Chat On WhatsApp
      </ButtonLink>
    </div>
  );

  return (
    <section className="overflow-hidden bg-black px-[var(--site-gutter)] py-16 text-white sm:py-20 lg:py-24">
      <div
        className={`mx-auto grid max-w-[var(--site-content)] gap-10 border-t border-white/15 pt-12 lg:items-center ${
          image ? "lg:grid-cols-[1.1fr_0.9fr]" : "lg:grid-cols-[1fr_auto]"
        }`}
      >
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="mt-5 max-w-4xl text-4xl font-bold uppercase leading-[0.98] sm:text-5xl lg:text-7xl">
            <TwoToneTitle title={heading} accent={headingAccent} accentTone="yellow" />
          </h2>
          <p className="mt-6 max-w-xl text-base leading-7 text-gray-300 sm:text-lg">{text}</p>
          {image ? <div className="mt-9">{buttons}</div> : null}
        </div>
        {image ? (
          <div className="flex justify-center lg:justify-end">
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width || 600}
              height={image.height || 600}
              loading="lazy"
              sizes="(min-width: 1024px) 460px, (min-width: 640px) 380px, 280px"
              className="h-auto w-72 sm:w-96 lg:w-[28rem]"
            />
          </div>
        ) : (
          buttons
        )}
      </div>
    </section>
  );
}
