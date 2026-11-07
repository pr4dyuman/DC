import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import TemplateTile from "@/components/marketing/templates/TemplateTile";
import { getPortfolioCaseStudies, getPortfolioServiceCounts } from "@/lib/marketing-portfolio";
import { getMarketingTemplatePageTotal, getMarketingTemplates } from "@/lib/marketing-templates";

import PortfolioCaseCard from "./PortfolioCaseCard";
import PortfolioWorkGrid from "./PortfolioWorkGrid";
import PreviewBanner from "./PreviewBanner";

// Desktop columns for the templates shelf, so the tiles fill one even row.
const TEMPLATE_SHELF_COLUMNS = [
  "",
  "lg:grid-cols-1",
  "lg:grid-cols-2",
  "lg:grid-cols-3",
  "lg:grid-cols-4",
  "sm:grid-cols-3 lg:grid-cols-5",
];

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

const workingPrinciples = [
  "Clear business purpose",
  "Useful, responsive interfaces",
  "Maintainable systems",
  "Measured improvement",
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

function padCount(value) {
  return String(value).padStart(2, "0");
}

function joinLabels(labels) {
  const words = labels.map((label) => (label === label.toUpperCase() ? label : label.toLowerCase()));
  const text = words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}` : words[0];
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// The /portfolio page. With `preview`, sample case studies are mixed in to
// show every service; that version lives at the noindex /portfolio/preview.
export default function PortfolioPageContent({ preview = false }) {
  const studies = getPortfolioCaseStudies({ includeSamples: preview });
  const counts = getPortfolioServiceCounts(studies);
  const templates = getMarketingTemplates();
  const websitesOnly = counts.every(({ service }) => service.id === "web" || service.id === "app");

  const intro = websitesOnly
    ? "Client websites and web apps with live walkthroughs and direct links to the work, plus the ready-made website templates we design and sell."
    : `${joinLabels(counts.map(({ service }) => service.label))} work, each with the results behind it, plus the website templates we design and sell.`;

  const stats = websitesOnly
    ? [
        { label: "Client projects", value: padCount(studies.length) },
        { label: "Website templates", value: padCount(templates.length) },
        { label: "Template pages", value: padCount(getMarketingTemplatePageTotal()) },
      ]
    : [
        { label: "Case studies", value: padCount(studies.length) },
        { label: "Services", value: padCount(counts.length) },
        { label: "Website templates", value: padCount(templates.length) },
      ];

  const serviceCount = (ids) => studies.filter((study) => study.services.some((id) => ids.includes(id))).length;

  return (
    <main className="bg-black text-white">
      {preview ? (
        <PreviewBanner>
          Real projects mixed with sample case studies, marked “Sample”, to show every service. Samples never
          appear on the public portfolio, and this page is hidden from search engines.
        </PreviewBanner>
      ) : null}

      <section className="border-b border-white/10 px-[var(--site-gutter)] pb-10 pt-10 sm:pb-12 sm:pt-12 lg:pb-14 lg:pt-14">
        <div className="mx-auto max-w-[var(--site-content)]">
          <div className="grid gap-8 lg:grid-cols-[0.98fr_0.62fr] lg:items-end">
            <div>
              <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30]">
                Portfolio / Selected Work
              </p>
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
                  Explore Work
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
          <div className="flex flex-col gap-4 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">
                Client Projects
              </p>
              <h2 className="mt-4 text-4xl font-bold uppercase leading-none sm:text-5xl">Selected Work</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-gray-400">
              {websitesOnly
                ? "Every project links to the live product, with a walkthrough of how it works."
                : "Pick a service to see the work and the numbers behind it. Open any case study for the full story."}
            </p>
          </div>

          <div className="mt-8">
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

      {templates.length ? (
        <section id="templates" className="border-t border-white/10 px-[var(--site-gutter)] py-14 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-[var(--site-content)]">
            <div className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">
                  Our Own Products
                </p>
                <h2 className="mt-4 text-4xl font-bold uppercase leading-none sm:text-5xl">Templates We Design And Sell</h2>
              </div>
              <div className="max-w-md">
                <p className="text-sm leading-6 text-gray-400">
                  Ready-made websites for academies, restaurants, estate agencies, clinics and law firms. Try a live demo,
                  buy one, or let us set it up for you.
                </p>
                <Link
                  href="/templates"
                  prefetch={false}
                  className={`mt-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#F5EE30] transition-colors hover:text-white ${focusRing}`}
                >
                  Browse All Templates
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className={`mt-8 grid grid-cols-2 gap-3 sm:gap-5 ${TEMPLATE_SHELF_COLUMNS[templates.length] || "lg:grid-cols-4"}`}>
              {templates.map((template) => (
                <TemplateTile key={template.slug} template={template} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-y border-white/10 bg-[#F5EE30] px-[var(--site-gutter)] py-14 text-black sm:py-16 lg:py-20">
        <div className="mx-auto grid max-w-[var(--site-content)] gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div>
            <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-black/60 sm:text-sm">
              Across The Work
            </p>
            <h2 className="mt-4 max-w-xl text-4xl font-bold uppercase leading-[0.96] sm:text-5xl lg:text-6xl">
              Different outputs. One connected approach.
            </h2>
          </div>

          <ul className="grid border-t border-black/20 sm:grid-cols-2">
            {SERVICE_PAGES.map((page) => {
              const count = serviceCount(page.ids);

              return (
                <li
                  key={page.href}
                  className="flex flex-col border-b border-black/20 py-6 sm:min-h-48 sm:px-6 sm:odd:border-r sm:odd:pl-0"
                >
                  <h3 className="text-xl font-bold uppercase leading-tight">{page.label}</h3>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-black/70">{page.description}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-5">
                    <Link
                      href={page.href}
                      prefetch={false}
                      className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-black underline decoration-black/30 underline-offset-4 transition-colors hover:decoration-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
                    >
                      Service details
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                    {count ? (
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-black/55">
                        {count} {count === 1 ? "project" : "projects"} above
                      </span>
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
                Start A Conversation
              </p>
              <h2 className="mt-4 max-w-4xl text-4xl font-bold uppercase leading-[0.95] sm:text-5xl lg:text-7xl">
                Have a project that needs a sharper digital direction?
              </h2>
            </div>
            <Link
              href="/contact"
              prefetch={false}
              className={`inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-white px-7 py-4 text-sm font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5EE30] ${focusRing}`}
            >
              Discuss Your Project
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
