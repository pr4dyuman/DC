import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { MARKETING_SERVICE_PAGES } from "@/lib/marketing-service-pages";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

function padCount(value) {
  return String(value).padStart(2, "0");
}

// The six services as cards, on /services and the homepage. The service name
// is the card's link and covers the whole card. `compact` (homepage) leaves out
// the illustrations, and on phones shows each service as a short row: its
// tagline and name, without the description.
export default function ServiceCards({ headingLevel = "h3", compact = false }) {
  const Heading = headingLevel;

  return (
    <ul className={`m-0 grid list-none p-0 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 ${compact ? "gap-3" : "gap-5"}`}>
      {MARKETING_SERVICE_PAGES.map((service, index) => (
        <li key={service.slug} className="flex">
          <article
            className={`group relative flex w-full flex-col border border-white/10 bg-white/[0.03] transition-colors hover:border-[#F5EE30]/60 hover:bg-[#F5EE30]/[0.04] focus-within:border-[#F5EE30]/60 sm:p-7 ${
              compact ? "p-5" : "p-6"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <p className="m-0 font-glacial-bold text-xs uppercase tracking-[0.24em] text-[#F5EE30]">{service.eyebrow}</p>
              <span aria-hidden="true" className={`font-glacial-bold text-sm text-white/40 ${compact ? "hidden sm:inline" : ""}`}>
                {padCount(index + 1)}
              </span>
              {compact ? (
                <ArrowRight
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-white transition-colors group-hover:text-[#F5EE30] sm:hidden"
                />
              ) : null}
            </div>
            {compact ? null : (
              <Image
                src={service.image.src}
                alt=""
                width={260}
                height={260}
                loading="lazy"
                className="mx-auto my-6 h-32 w-auto sm:h-40"
              />
            )}
            <Heading
              className={`font-bold uppercase leading-tight ${compact ? "mt-3 text-xl sm:mt-5 sm:text-2xl" : "m-0 text-2xl"}`}
            >
              <Link
                href={service.path}
                prefetch={false}
                className={`after:absolute after:inset-0 after:content-[''] ${focusRing}`}
              >
                {service.title}
              </Link>
            </Heading>
            <p className={`mt-3 text-sm leading-6 text-gray-300 sm:text-base sm:leading-7 ${compact ? "hidden sm:block" : ""}`}>
              {service.cardText}
            </p>
            <span
              aria-hidden="true"
              className={`mt-auto items-center gap-2 pt-6 font-glacial-bold text-sm uppercase tracking-[0.16em] text-white transition-colors group-hover:text-[#F5EE30] ${
                compact ? "hidden sm:inline-flex" : "inline-flex"
              }`}
            >
              Explore
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </article>
        </li>
      ))}
    </ul>
  );
}
