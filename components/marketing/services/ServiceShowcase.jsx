import Image from "next/image";
import Link from "next/link";

import { MARKETING_SERVICE_PAGES } from "@/lib/marketing-service-pages";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

function padCount(value) {
  return String(value).padStart(2, "0");
}

// Homepage: the six services as illustrated cards over the black-and-white
// desk photo, in the original homepage's style. Each card turns yellow from the
// bottom on hover. Phones swipe through the cards; wide screens show all six.
// The service name is the card's link and covers the whole card.
export default function ServiceShowcase() {
  return (
    <div className="relative overflow-hidden px-[var(--site-gutter)] py-10 sm:py-12 lg:py-16">
      <Image
        src="/ssbg-1600-q74.jpg"
        alt=""
        fill
        loading="lazy"
        sizes="100vw"
        className="object-cover opacity-50 grayscale"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black opacity-60" />

      <ul className="relative -mx-[var(--site-gutter)] m-0 flex list-none snap-x snap-mandatory scroll-px-[var(--site-gutter)] overflow-x-auto px-[var(--site-gutter)] [scrollbar-width:none] lg:mx-auto lg:grid lg:max-w-[var(--site-content)] lg:grid-cols-3 lg:overflow-visible lg:border-r lg:border-white/30 lg:px-0 [&::-webkit-scrollbar]:hidden">
        {MARKETING_SERVICE_PAGES.map((service, index) => {
          const [first, second] = service.cardTitle || service.titleParts;

          return (
            <li
              key={service.slug}
              className="flex w-[80%] shrink-0 snap-start border-r border-white/30 last:border-r sm:w-[48%] md:w-[38%] lg:w-auto lg:border-r-0 lg:[&:nth-child(-n+3)]:border-b lg:[&:nth-child(-n+3)]:border-white/20"
            >
              <article className="group relative flex w-full flex-col border-l border-white/30 px-5 pb-7 pt-6 sm:px-6 lg:px-8 lg:pb-9 lg:pt-8">
                {/* Black from the bottom by default; yellow on hover or keyboard focus. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-80 transition-opacity duration-300 group-focus-within:opacity-0 group-hover:opacity-0 motion-reduce:transition-none"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#F5EE30] via-[#F5EE30]/30 to-transparent opacity-0 transition-opacity duration-300 group-focus-within:opacity-90 group-hover:opacity-90 motion-reduce:transition-none"
                />

                <div className="relative flex h-full flex-col">
                  <p aria-hidden="true" className="m-0 text-2xl font-bold text-white lg:text-3xl">
                    .{padCount(index + 1)}
                  </p>
                  <h3 className="m-0 mt-1 font-etna text-2xl uppercase leading-tight lg:text-[1.9rem]">
                    <Link
                      href={service.path}
                      prefetch={false}
                      className={`after:absolute after:inset-0 after:content-[''] ${focusRing}`}
                    >
                      <span className="block text-white">{first}</span>{" "}
                      <span className="block text-[#F5EE30]">{second}</span>
                    </Link>
                  </h3>
                  <div className="relative mx-auto my-6 aspect-square w-full max-w-[13rem] sm:max-w-[15rem]">
                    <Image
                      src={service.image.src}
                      alt=""
                      fill
                      loading="lazy"
                      sizes="(min-width: 640px) 240px, 208px"
                      className="object-contain transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  </div>
                  <p className="m-0 text-sm leading-6 text-gray-300 transition-colors group-focus-within:text-black group-hover:text-black">
                    {service.cardText}
                  </p>
                  <span
                    aria-hidden="true"
                    className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold uppercase tracking-[0.12em] text-[#F5EE30] transition-colors group-focus-within:text-black group-hover:text-black"
                  >
                    Learn more
                    <Image
                      src="/airoplane.svg"
                      alt=""
                      width={16}
                      height={16}
                      className="h-4 w-4 transition group-focus-within:brightness-0 group-hover:translate-x-1 group-hover:brightness-0"
                    />
                  </span>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
