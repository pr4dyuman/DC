import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Camera,
  Check,
  ClipboardList,
  ExternalLink,
  Film,
  Gauge,
  LayoutTemplate,
  Link2,
  MapPin,
  Megaphone,
  PenLine,
  Repeat,
  Scissors,
  Search,
  Share2,
  SlidersHorizontal,
  Smartphone,
  Target,
  TrendingUp,
  Users,
  Video,
  Wrench,
} from "lucide-react";

import ServiceCaseStudies from "@/components/marketing/portfolio/ServiceCaseStudies";
import ButtonLink from "@/components/marketing/ui/ButtonLink";
import CtaBand from "@/components/marketing/ui/CtaBand";
import PageHero from "@/components/marketing/ui/PageHero";
import { PageSection, SectionIntro } from "@/components/marketing/ui/PageSection";
import { getMarketingContactHref } from "@/lib/marketing-contact";
import {
  getMarketingBreadcrumbJsonLd,
  getMarketingServiceJsonLd,
  serializeMarketingJsonLd,
} from "@/lib/marketing-seo";

const ICONS = {
  wrench: Wrench,
  search: Search,
  "map-pin": MapPin,
  link: Link2,
  target: Target,
  pen: PenLine,
  layout: LayoutTemplate,
  sliders: SlidersHorizontal,
  chart: BarChart3,
  trending: TrendingUp,
  megaphone: Megaphone,
  camera: Camera,
  smartphone: Smartphone,
  gauge: Gauge,
  clipboard: ClipboardList,
  video: Video,
  scissors: Scissors,
  film: Film,
  share: Share2,
  users: Users,
  repeat: Repeat,
};

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
  const deliverableColumns = service.deliverables.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3";

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
        title={service.title}
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
        <SectionIntro id="service-audience" eyebrow="Who It's For" title="Built For Businesses Like Yours" />
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
        <SectionIntro id="service-deliverables" eyebrow="What You Get" title="What's Included" />
        <ul className={`m-0 mt-8 grid list-none gap-5 p-0 md:grid-cols-2 ${deliverableColumns}`}>
          {service.deliverables.map((group) => {
            const Icon = ICONS[group.icon] || Check;
            return (
              <li key={group.title} className="flex flex-col border border-white/10 bg-white/[0.03] p-6 sm:p-7">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#F5EE30] text-black">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-xl font-bold uppercase leading-tight">{group.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-300">{group.text}</p>
                <ul className="m-0 mt-5 flex list-none flex-col gap-2.5 border-t border-white/10 p-0 pt-5">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-white/85">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-[#F5EE30]" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </PageSection>

      <PageSection labelledBy="service-process" tone="yellow">
        <SectionIntro id="service-process" eyebrow="How It Works" title="From First Call To Results" tone="yellow" />
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
            <p className="m-0 font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">What It Costs</p>
            <h2 id="service-pricing" className="mt-4 text-4xl font-bold uppercase leading-none sm:text-5xl">
              Priced For Your Goals
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
        <SectionIntro id="service-faqs" eyebrow="Common Questions" title="Questions We Hear Often" />
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
            <p className="m-0 font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">Related Services</p>
            <h2 id="service-related" className="mt-4 text-3xl font-bold uppercase leading-none sm:text-4xl">
              Works Well With
            </h2>
            <LinkList
              items={service.relatedLinks
                .filter((link) => link.href !== "/blog")
                .map((link) => ({ href: link.href, title: link.title, note: link.description }))}
            />
          </div>
          <div>
            <p className="m-0 font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">From The Blog</p>
            <h2 className="mt-4 text-3xl font-bold uppercase leading-none sm:text-4xl">Guides From Our Team</h2>
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
        text={service.closing.text}
        primaryLabel={service.ctaLabel}
        primaryHref={contactHref}
        whatsappPath={service.path}
      />
    </main>
  );
}
