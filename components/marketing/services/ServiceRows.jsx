import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { MARKETING_SERVICE_PAGES } from "@/lib/marketing-service-pages";

// /services: each service with its large illustration, the name in two tones
// and a white button to its page, alternating sides as on the original page.
export default function ServiceRows({ headingLevel = "h3" }) {
  const Heading = headingLevel;

  return (
    <div className="flex flex-col">
      {MARKETING_SERVICE_PAGES.map((service, index) => {
        const flip = index % 2 === 1;
        const [first, second] = service.cardTitle || service.titleParts;

        return (
          <article
            key={service.slug}
            className="grid items-center gap-8 border-b border-white/10 py-12 last:border-b-0 sm:py-14 lg:grid-cols-2 lg:gap-16 lg:py-16"
          >
            <div className={`flex justify-center ${flip ? "lg:order-2 lg:justify-end" : "lg:justify-start"}`}>
              <div className="relative aspect-square w-60 sm:w-80 lg:w-[26rem]">
                <Image
                  src={service.image.src}
                  alt=""
                  fill
                  loading={index < 2 ? "eager" : "lazy"}
                  sizes="(min-width: 1024px) 416px, (min-width: 640px) 320px, 240px"
                  className="object-contain"
                />
              </div>
            </div>
            <div className={flip ? "lg:order-1 lg:text-right" : ""}>
              <p className="m-0 font-glacial-bold text-xs uppercase tracking-[0.24em] text-[#F5EE30] sm:text-sm">
                {service.eyebrow}
              </p>
              <Heading className="mt-3 text-3xl font-bold uppercase leading-tight sm:text-4xl xl:text-5xl">
                <span className="text-white">{first}</span> <span className="text-[#F5EE30]">{second}</span>
              </Heading>
              <p className={`mt-4 max-w-xl text-base leading-7 text-gray-300 sm:text-lg ${flip ? "lg:ml-auto" : ""}`}>
                {service.cardText}
              </p>
              <div className={`mt-7 flex ${flip ? "lg:justify-end" : ""}`}>
                <Link
                  href={service.path}
                  prefetch={false}
                  className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] text-black transition-colors hover:bg-[#F5EE30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
                >
                  Explore {service.seo.breadcrumbName}
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
