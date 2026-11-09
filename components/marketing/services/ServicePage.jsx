import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, ExternalLink } from "lucide-react";

import ServiceCaseStudies from "@/components/marketing/portfolio/ServiceCaseStudies";
import ButtonLink from "@/components/marketing/ui/ButtonLink";
import CtaBand from "@/components/marketing/ui/CtaBand";
import PageHero from "@/components/marketing/ui/PageHero";
import { Eyebrow, PageSection, SectionIntro, TwoToneTitle } from "@/components/marketing/ui/PageSection";
import { getMarketingContactHref } from "@/lib/marketing-contact";
import {
  getMarketingBreadcrumbJsonLd,
  getMarketingServiceJsonLd,
  serializeMarketingJsonLd,
} from "@/lib/marketing-seo";

function padCount(value) {
  return String(value).padStart(2, "0");
}

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

// A compact list of links, one row each (related services, blog guides).
function LinkList({ items }) {
  return (
    <ul className="m-0 mt-6 list-none border-t border-white/10 p-0">
      {items.map((item) => {
        const external = item.href.startsWith("http");
        const content = (
          <>
            <span>
              {item.eyebrow ? (
                <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-[#F5EE30]">{item.eyebrow}</span>
              ) : null}
              <span className="mt-1 block font-bold uppercase leading-snug text-white transition-colors group-hover:text-[#F5EE30]">
                {item.title}
              </span>
              {item.note ? <span className="mt-1 block text-sm leading-6 text-gray-400">{item.note}</span> : null}
              {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
            </span>
            {external ? (
              <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-[#F5EE30]" aria-hidden="true" />
            ) : (
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#F5EE30] transition-transform group-hover:translate-x-1" aria-hidden="true" />
            )}
          </>
        );
        const className = `group flex items-start justify-between gap-4 py-4 ${focusRing}`;

        return (
          <li key={item.href} className="border-b border-white/10">
            {external ? (
              <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
                {content}
              </a>
            ) : (
              <Link href={item.href} prefetch={false} className={className}>
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function getStructuredData(service) {
  return [
    getMarketingServiceJsonLd({
      name: service.seo.name,
      description: service.seo.description,
      path: service.path,
      serviceType: service.seo.serviceType,
    }),
    getMarketingBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Services", path: "/services" },
      { name: service.seo.breadcrumbName, path: service.path },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: service.faqs.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ];
}

// The layout every service page (/services/<slug>) shares. Content comes from
// lib/marketing-service-pages.
export default function ServicePage({ service }) {
  const contactHref = getMarketingContactHref({ service: service.slug });

  return (
    <main className="bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeMarketingJsonLd(getStructuredData(service)) }}
      />

      <PageHero
        breadcrumbs={[
          { name: "Home", href: "/" },
          { name: "Services", href: "/services" },
          { name: service.seo.breadcrumbName },
        ]}
        eyebrow={service.eyebrow}
        title={service.titleParts[0]}
        accent={service.titleParts[1]}
        titleSize={service.titleSize}
        intro={<p className="m-0">{service.summary}</p>}
        image={service.image}
        checklist={service.highlights}
        actions={
          <>
            <ButtonLink href={contactHref} arrow>
              {service.ctaLabel}
            </ButtonLink>
            <ButtonLink href="#results" variant="secondary">
              {service.resultsLabel}
            </ButtonLink>
          </>
        }
      />

      <PageSection labelledBy="service-audience" bordered={false}>
        <SectionIntro id="service-audience" eyebrow="Who It's For" title="Built For Businesses" accent="Like Yours" />
        <ul className="m-0 mt-8 grid list-none gap-5 p-0 md:grid-cols-3">
          {service.audience.map((item, index) => (
            <li key={item.title} className="border border-white/10 bg-white/[0.03] p-6 sm:p-7">
              <p className="m-0 font-glacial-bold text-sm text-[#F5EE30]">{padCount(index + 1)}</p>
              <h3 className="mt-4 text-xl font-bold uppercase leading-tight">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-gray-300 sm:text-base sm:leading-7">{item.text}</p>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection labelledBy="service-deliverables">
        <SectionIntro id="service-deliverables" eyebrow="What You Get" title="What's" accent="Included" />
        {/* The original pages' illustrations, alternating sides on wide screens. */}
        <div className="flex flex-col">
          {service.deliverables.map((group, index) => {
            const flip = index % 2 === 1;
            return (
              <article
                key={group.title}
                className="grid items-center gap-8 border-b border-white/10 py-12 last:border-b-0 last:pb-0 lg:grid-cols-2 lg:gap-16 lg:py-16"
              >
                <div className={`flex justify-center ${flip ? "lg:order-2 lg:justify-end" : "lg:justify-start"}`}>
                  <div className="relative aspect-square w-56 sm:w-72 lg:w-[24rem]">
                    <Image
                      src={group.image}
                      alt=""
                      fill
                      loading="lazy"
                      sizes="(min-width: 1024px) 384px, (min-width: 640px) 288px, 224px"
                      className="object-contain"
                    />
                  </div>
                </div>
                <div className={flip ? "lg:order-1" : ""}>
                  <p className="m-0 font-glacial-bold text-sm tracking-widest text-[#F5EE30]">.{padCount(index + 1)}</p>
                  <h3 className="mt-3 text-3xl font-extrabold uppercase leading-[1.02] sm:text-4xl xl:text-5xl">
                    <TwoToneTitle title={group.heading[0]} accent={group.heading[1]} />
                  </h3>
                  <p className="mt-5 max-w-xl text-base leading-7 text-gray-300 sm:text-lg">{group.text}</p>
                  <ul className="m-0 mt-6 flex max-w-xl list-none flex-col gap-3 p-0">
                    {group.items.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-base leading-7 text-white/85">
                        <span aria-hidden="true" className="mt-[11px] h-2 w-2 shrink-0 rounded-full bg-[#F5EE30]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </PageSection>

      <PageSection labelledBy="service-process" tone="yellow">
        <SectionIntro id="service-process" eyebrow="How It Works" title="From First Call" accent="To Results" tone="yellow" />
        <ol className="m-0 mt-8 grid list-none gap-px overflow-hidden border border-black/15 bg-black/15 p-0 md:grid-cols-2 lg:grid-cols-4">
          {service.process.map((step, index) => (
            <li key={step.title} className="bg-[#F5EE30] p-6 sm:p-8">
              <p className="m-0 font-suifak text-4xl leading-none sm:text-5xl">{padCount(index + 1)}</p>
              <h3 className="mt-4 text-2xl font-bold uppercase sm:mt-6">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-black/75 sm:text-base sm:leading-7">{step.description}</p>
            </li>
          ))}
        </ol>
      </PageSection>

      <div id="results" className="scroll-mt-6 bg-black px-[var(--site-gutter)] pt-14 sm:pt-16 lg:pt-20">
        <div className="mx-auto max-w-[var(--site-content)]">
          <ServiceCaseStudies
            contactService={service.slug}
            services={service.caseStudies.services}
            title={service.caseStudies.title}
            linkLabel={service.caseStudies.linkLabel}
          />
        </div>
      </div>

      <PageSection labelledBy="service-pricing">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <Eyebrow>What It Costs</Eyebrow>
            <h2 id="service-pricing" className="mt-5 text-4xl font-bold uppercase leading-[1.02] sm:text-5xl xl:text-6xl">
              <TwoToneTitle title="Priced For" accent="Your Goals" />
            </h2>
            <p className="mt-8 font-suifak text-5xl uppercase leading-none text-[#F5EE30] sm:text-6xl">
              {service.pricing.from ? `From ${service.pricing.from}` : "Custom quote"}
            </p>
            <p className="mt-5 max-w-xl text-base leading-7 text-gray-300 sm:text-lg">
              Every business needs something different, so we price each plan after a free consultation. You will see the
              full plan and price before you commit.
            </p>
            <div className="mt-7">
              <ButtonLink href={contactHref} arrow>
                {service.ctaLabel}
              </ButtonLink>
            </div>
          </div>
          <div className="border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <h3 className="m-0 text-xl font-bold uppercase">Every plan includes</h3>
            <ul className="m-0 mt-5 flex list-none flex-col gap-4 p-0">
              {[...service.expectations, "A reply within 24 hours of your enquiry."].map((item) => (
                <li key={item} className="flex items-start gap-3 border-b border-white/10 pb-4 text-base leading-7 text-gray-300 last:border-b-0 last:pb-0">
                  <Check className="mt-1.5 h-4 w-4 shrink-0 text-[#F5EE30]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PageSection>

      <PageSection labelledBy="service-faqs">
        <SectionIntro id="service-faqs" eyebrow="Common Questions" title="Questions We" accent="Hear Often" />
        <div className="mt-8 border-y border-white/10">
          {service.faqs.map((item, index) => (
            <details key={item.question} open={index === 0} className="group border-b border-white/10 last:border-b-0">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30] [&::-webkit-details-marker]:hidden">
                <h3 className="m-0 text-lg font-bold uppercase leading-snug sm:text-xl">{item.question}</h3>
                <span
                  aria-hidden="true"
                  className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/25 text-lg leading-none text-[#F5EE30] transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="m-0 max-w-3xl pb-6 text-base leading-7 text-gray-300">{item.answer}</p>
            </details>
          ))}
        </div>
      </PageSection>

      <PageSection labelledBy="service-related">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Eyebrow>Related Services</Eyebrow>
            <h2 id="service-related" className="mt-5 text-3xl font-bold uppercase leading-none sm:text-4xl">
              Works Well With
            </h2>
            <LinkList
              items={service.relatedLinks
                .filter((link) => link.href !== "/blog")
                .map((link) => ({ href: link.href, title: link.title, note: link.description }))}
            />
          </div>
          <div>
            <Eyebrow>From The Blog</Eyebrow>
            <h2 className="mt-5 text-3xl font-bold uppercase leading-none sm:text-4xl">Guides From Our Team</h2>
            <LinkList
              items={service.relatedArticles.map((article) => ({
                href: article.href,
                title: article.title,
                eyebrow: article.category,
              }))}
            />
          </div>
        </div>
      </PageSection>

      <CtaBand
        title={service.closing.title}
        accent={service.closing.accent}
        text={service.closing.text}
        primaryLabel={service.ctaLabel}
        primaryHref={contactHref}
        whatsappPath={service.path}
      />
    </main>
  );
}
