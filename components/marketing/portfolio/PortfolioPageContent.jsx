import Link from "next/link";
import { ArrowRight, Check, ExternalLink } from "lucide-react";

import TemplateRail from "@/components/marketing/templates/TemplateRail";
import TemplateTile from "@/components/marketing/templates/TemplateTile";
import { getPortfolioServiceCounts, getServiceExamples, selectCaseStudies } from "@/lib/marketing-portfolio";
import { loadAllCaseStudies } from "@/lib/marketing-portfolio-store";
import { getMarketingTemplatePageTotal, getMarketingTemplates } from "@/lib/marketing-templates";

import PortfolioCaseCard from "./PortfolioCaseCard";
import PortfolioFilterLink from "./PortfolioFilterLink";
import PortfolioWorkGrid from "./PortfolioWorkGrid";
import PreviewBanner from "./PreviewBanner";
import ServiceExampleCard from "./ServiceExampleCard";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

const WHATSAPP_URL = "https://wa.me/918003177679";

const workingPrinciples = [
  "Clear goals from day one",
  "Design that fits the brand",
  "Fast, easy-to-update builds",
  "Honest, measured reporting",
];

const SERVICE_PAGES = [
  {
    label: "Web development",
    href: "/services/web-development",
    ids: ["web", "app"],
    description: "Business sites, online stores, landing pages and web apps.",
  },
  {
    label: "SEO",
    href: "/services/seo",
    ids: ["seo"],
    description: "Technical fixes, content and local search that bring in enquiries.",
  },
  {
    label: "Social media",
    href: "/services/social-media-marketing",
    ids: ["social"],
    description: "Content, community and paid social that keep a brand in view.",
  },
  {
    label: "PPC advertising",
    href: "/services/ppc",
    ids: ["ads"],
    description: "Google and Meta campaigns measured on leads and cost per lead.",
  },
  {
    label: "Video production",
    href: "/services/video-production-ad",
    ids: ["video"],
    description: "Ad films, reels and launch videos made to be watched.",
  },
  {
    label: "Influencer marketing",
    href: "/services/influencer-marketing",
    ids: ["influencer"],
    description: "Creator campaigns tracked through to sales and sign-ups.",
  },
];

const WEBSITE_SERVICE_IDS = ["web", "app"];

function padCount(value) {
  return String(value).padStart(2, "0");
}

function joinLabels(labels) {
  const words = labels.map((label) => (label === label.toUpperCase() ? label : label.toLowerCase()));
  return words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}` : words[0];
}

function SectionIntro({ eyebrow, title, children }) {
  return (
    <div className="flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">{eyebrow}</p>
        <h2 className="mt-4 text-4xl font-bold uppercase leading-none sm:text-5xl">{title}</h2>
      </div>
      {children ? <div className="max-w-md">{children}</div> : null}
    </div>
  );
}

// The /portfolio page. With `preview`, sample case studies are mixed in to
// show every service; that version lives at the noindex /portfolio/preview.
export default async function PortfolioPageContent({ preview = false }) {
  const all = await loadAllCaseStudies();
  const studies = selectCaseStudies(all, { includeSamples: preview });
  // The preview already shows each sample in the grid.
  const examples = preview ? [] : getServiceExamples(all);
  const counts = getPortfolioServiceCounts(studies);
  const templates = getMarketingTemplates();
  const marketingServices = counts.filter(({ service }) => !WEBSITE_SERVICE_IDS.includes(service.id));
  const websitesOnly = marketingServices.length === 0;

  const exampleLabels = examples.map(({ service }) => service.label);
  const exampleLine = exampleLabels.length ? `Examples of how we report ${joinLabels(exampleLabels)} work.` : null;
  const intro = [
    websitesOnly
      ? "Websites and web apps we have built for clients, each with a walkthrough and a link to the live product."
      : `Websites and web apps we have built, and the ${joinLabels(
          marketingServices.map(({ service }) => service.label),
        )} work behind our clients' growth.`,
    exampleLine,
    "Plus the website templates we design and sell.",
  ]
    .filter(Boolean)
    .join(" ");

  const stats = websitesOnly
    ? [
        { label: "Client projects", value: padCount(studies.length) },
        { label: "Website templates", value: padCount(templates.length) },
        { label: "Template pages", value: padCount(getMarketingTemplatePageTotal()) },
      ]
    : [
        { label: "Projects", value: padCount(studies.length) },
        { label: "Services", value: padCount(counts.length) },
        { label: "Website templates", value: padCount(templates.length) },
      ];

  const serviceCount = (ids) => studies.filter((study) => study.services.some((id) => ids.includes(id))).length;

  return (
    <main className="bg-black text-white">
      {preview ? (
        <PreviewBanner>
          Real projects plus sample case studies, marked “Sample”, to show every service. Samples never appear on the
          public portfolio, and search engines don’t index this page.
        </PreviewBanner>
      ) : null}

      <section className="border-b border-white/10 px-[var(--site-gutter)] pb-10 pt-10 sm:pb-12 sm:pt-12 lg:pb-14 lg:pt-14">
        <div className="mx-auto max-w-[var(--site-content)]">
          <div className="grid gap-8 lg:grid-cols-[0.98fr_0.62fr] lg:items-end">
            <div>
              <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30]">Portfolio</p>
              <h1 className="mt-5 max-w-4xl font-suifak text-[clamp(3.1rem,7.2vw,6.4rem)] uppercase leading-[0.86]">
                Built By
                <br />
                Digital Corvids
              </h1>
            </div>

            <div className="max-w-xl border-t border-white/15 pt-6 lg:justify-self-end">
              <p className="text-base leading-7 text-gray-300 sm:text-lg">{intro}</p>
              <dl className="mt-7 grid grid-cols-3 border-y border-white/10">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="border-r border-white/10 py-4 pr-4 last:border-r-0 last:pr-0 [&:not(:first-child)]:pl-4"
                  >
                    <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">{stat.label}</dt>
                    <dd className="mt-2 text-2xl font-bold tracking-[0.06em] text-white">{stat.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="#work"
                  className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#F5EE30] px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-white ${focusRing}`}
                >
                  See The Work
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/contact"
                  prefetch={false}
                  className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/20 px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition-colors hover:border-[#F5EE30] hover:text-[#F5EE30] ${focusRing}`}
                >
                  Start A Project
                </Link>
              </div>
            </div>
          </div>

          <ul className="mt-10 grid border-y border-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {workingPrinciples.map((principle) => (
              <li
                key={principle}
                className="flex min-h-14 items-center gap-3 border-b border-white/10 py-3 sm:[&:nth-child(n+3)]:border-b-0 lg:border-b-0 lg:border-r lg:px-5 lg:first:pl-0 lg:last:border-r-0"
              >
                <Check className="h-4 w-4 shrink-0 text-[#F5EE30]" aria-hidden="true" />
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/85">{principle}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="work" className="scroll-mt-6 px-[var(--site-gutter)] py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[var(--site-content)]">
          <SectionIntro eyebrow="Our Work" title="Selected Projects">
            <p className="text-sm leading-6 text-gray-400">
              {websitesOnly
                ? "Every project has a walkthrough and a link to the live product."
                : "Filter by service to see the work and the numbers behind it. Open a case study for the full story."}
            </p>
          </SectionIntro>

          <div className="mt-6">
            <PortfolioWorkGrid
              filters={counts.map(({ service, count }) => ({ id: service.id, label: service.label, count }))}
              items={studies.map((study) => ({
                slug: study.slug,
                services: study.services,
                featured: Boolean(study.featured),
              }))}
            >
              {studies.map((study, index) => (
                <PortfolioCaseCard key={study.slug} study={study} preview={preview} priority={index === 0} />
              ))}
            </PortfolioWorkGrid>
          </div>
        </div>
      </section>

      {examples.length ? (
        <section id="every-service" className="scroll-mt-6 border-t border-white/10 px-[var(--site-gutter)] py-14 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-[var(--site-content)]">
            <SectionIntro eyebrow="Every Service" title="How We Report Each Service">
              <p className="text-sm leading-6 text-gray-400">
                {`Examples of the reports and visuals you get for ${joinLabels(
                  exampleLabels,
                )} work. The numbers are illustrative, not a client's results.`}
              </p>
            </SectionIntro>

            <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
              {examples.map((example, index) => (
                <div
                  key={example.service.id}
                  className={examples.length % 2 === 1 && index === examples.length - 1 ? "lg:col-span-2" : undefined}
                >
                  <ServiceExampleCard example={example} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {templates.length ? (
        <section id="templates" className="overflow-hidden border-t border-white/10 px-[var(--site-gutter)] py-14 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-[var(--site-content)]">
            <SectionIntro eyebrow="Our Own Products" title="Templates We Design And Sell">
              <p className="text-sm leading-6 text-gray-400">
                Ready-made websites for AI startups, academies, restaurants, estate agencies, clinics and law firms. Try a live demo,
                buy one, or have us set it up for you.
              </p>
              <Link
                href="/templates"
                prefetch={false}
                className={`mt-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#F5EE30] transition-colors hover:text-white ${focusRing}`}
              >
                Browse All Templates
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </SectionIntro>

            <div className="mt-8">
              <TemplateRail label="Website templates">
                {templates.map((template) => (
                  <TemplateTile key={template.slug} template={template} />
                ))}
                <Link
                  key="all-templates"
                  href="/templates"
                  prefetch={false}
                  className={`group flex flex-col justify-between gap-8 rounded-lg border border-dashed border-white/20 bg-white/[0.02] p-5 transition-colors hover:border-[#F5EE30] sm:p-6 ${focusRing}`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">All templates</span>
                  <span>
                    <span className="block font-suifak text-6xl leading-none text-[#F5EE30]">{padCount(templates.length)}</span>
                    <span className="mt-4 block text-xl font-bold uppercase leading-tight">See every template</span>
                    <span className="mt-2 block text-sm leading-6 text-white/60">Live demos, page tours and prices.</span>
                  </span>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#F5EE30] text-black transition-transform group-hover:translate-x-1">
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
              </TemplateRail>
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-y border-white/10 bg-[#F5EE30] px-[var(--site-gutter)] py-14 text-black sm:py-16 lg:py-20">
        <div className="mx-auto grid max-w-[var(--site-content)] gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div>
            <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-black/60 sm:text-sm">What We Do</p>
            <h2 className="mt-4 max-w-xl text-4xl font-bold uppercase leading-[0.96] sm:text-5xl lg:text-6xl">
              One team for every channel.
            </h2>
            <p className="mt-6 max-w-md text-base leading-7 text-black/75">
              Websites, search, social, ads, video and creator campaigns, planned together so each one makes the others
              work harder.
            </p>
          </div>

          <ul className="grid border-t border-black/20 sm:grid-cols-2">
            {SERVICE_PAGES.map((page) => {
              const count = serviceCount(page.ids);
              const filterIds = page.ids.filter((id) => counts.some(({ service }) => service.id === id));
              const example = examples.find(({ service }) => page.ids.includes(service.id));

              return (
                <li
                  key={page.href}
                  className="flex flex-col border-b border-black/20 py-6 sm:min-h-48 sm:px-6 sm:odd:border-r sm:odd:pl-0"
                >
                  <h3 className="text-xl font-bold uppercase leading-tight">{page.label}</h3>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-black/70">{page.description}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-2 pt-5">
                    <Link
                      href={page.href}
                      prefetch={false}
                      className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-black underline decoration-black/30 underline-offset-4 transition-colors hover:decoration-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
                    >
                      About the service
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                    {count ? (
                      <PortfolioFilterLink
                        serviceIds={filterIds}
                        className="inline-flex items-center gap-2 rounded-full bg-black px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#F5EE30] transition-colors hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
                      >
                        See {count} {count === 1 ? "project" : "projects"}
                        <span className="sr-only"> for {page.label}</span>
                      </PortfolioFilterLink>
                    ) : example ? (
                      <a
                        href={`#example-${example.service.id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-black/40 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-black hover:text-[#F5EE30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
                      >
                        See an example
                        <span className="sr-only"> for {page.label}</span>
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="px-[var(--site-gutter)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[var(--site-content)] border-t border-white/15 pt-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">
                Start A Project
              </p>
              <h2 className="mt-4 max-w-4xl text-4xl font-bold uppercase leading-[0.95] sm:text-5xl lg:text-7xl">
                Have a project in mind?
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-gray-300 sm:text-lg">
                Tell us what you want to build or grow. We usually reply within 24{"\u00a0"}hours.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Link
                href="/contact"
                prefetch={false}
                className={`inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-white px-7 py-4 text-sm font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5EE30] ${focusRing}`}
              >
                Start A Project
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex min-h-14 items-center justify-center gap-3 rounded-full border border-white/25 px-7 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition-colors hover:border-[#F5EE30] hover:text-[#F5EE30] ${focusRing}`}
              >
                Chat On WhatsApp
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
