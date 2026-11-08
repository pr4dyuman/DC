import Link from "next/link";
import { ArrowRight, ExternalLink, Quote } from "lucide-react";

import { findNextCaseStudy, getPortfolioService, getStudyMark, getTitleFitFactor } from "@/lib/marketing-portfolio";
import { loadCaseStudies } from "@/lib/marketing-portfolio-store";

import CaseStudySpotlight from "./CaseStudySpotlight";
import KpiNumber from "./KpiNumber";
import PortfolioCaseCard from "./PortfolioCaseCard";
import PreviewBanner from "./PreviewBanner";
import ServiceTags from "./ServiceTags";
import PortfolioInsights from "./insights/PortfolioInsights";
import PortfolioProof from "./proofs/PortfolioProof";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

const PROOF_TITLES = {
  website: "The live product",
  seo: "Organic search, month by month",
  social: "The feed and the growth",
  ads: "The ad and the numbers",
  video: "The film",
  influencer: "The creators and their content",
  branding: "Before and after",
};

const KPI_COLUMNS = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

function padCount(value) {
  return String(value).padStart(2, "0");
}

function Eyebrow({ children, className = "" }) {
  return (
    <h2 className={`font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm ${className}`}>
      {children}
    </h2>
  );
}

// A case study page: the result first, then the proof, then how it happened.
export default async function CaseStudyPageContent({ study, preview = false }) {
  const sample = getStudyMark(study);
  const next = findNextCaseStudy(study, await loadCaseStudies({ includeSamples: preview }));
  const portfolioHref = preview ? "/portfolio/preview" : "/portfolio";
  const meta = [study.industry, study.location, study.period].filter(Boolean);
  const kpis = study.kpis || [];
  const story = study.story;
  const insights = study.insights || [];
  // On the preview, show how a results case study will look on its service page.
  const servicePage = getPortfolioService(study.services[0]);
  const showServicePreview = preview && study.proof.type !== "website" && Boolean(servicePage?.href);

  const glance = [
    ["Client", study.client],
    ["Industry", study.industry],
    study.location ? ["Location", study.location] : null,
    study.period ? ["Period", study.period] : null,
    [
      "Services",
      <span key="services" className="flex flex-wrap gap-x-2">
        {study.services.map((id, index) => {
          const service = getPortfolioService(id);
          const label = `${service.label}${index < study.services.length - 1 ? "," : ""}`;
          return service.href ? (
            <Link
              key={id}
              href={service.href}
              prefetch={false}
              className={`underline decoration-white/30 underline-offset-4 transition-colors hover:text-[#F5EE30] hover:decoration-[#F5EE30] ${focusRing}`}
            >
              {label}
            </Link>
          ) : (
            <span key={id}>{label}</span>
          );
        })}
      </span>,
    ],
    study.scope?.length ? ["Scope", study.scope.join(", ")] : null,
  ].filter(Boolean);

  return (
    <main className="bg-black text-white">
      {sample === "Sample" ? (
        <PreviewBanner>
          A sample case study with an invented client and numbers, to show the layout. It is never shown on the
          public portfolio.
        </PreviewBanner>
      ) : sample === "Draft" ? (
        <PreviewBanner>
          A draft from Super Admin → Case Studies. Only this preview shows it until it is published.
        </PreviewBanner>
      ) : null}

      <section className="border-b border-white/10 px-[var(--site-gutter)] pb-12 pt-8 sm:pt-10 lg:pb-16">
        <div className="mx-auto max-w-[var(--site-content)]">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/50">
              <li>
                <Link href={portfolioHref} prefetch={false} className={`transition-colors hover:text-[#F5EE30] ${focusRing}`}>
                  Portfolio
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-[#F5EE30]">
                {study.client}
              </li>
            </ol>
          </nav>

          <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end">
            <div className="@container min-w-0">
              <ServiceTags services={study.services} linked />
              {/* Sized to the column and the longest word, so names never break mid-word. */}
              <h1
                className="mt-5 font-suifak text-[length:var(--title-size)] uppercase leading-[0.86] [overflow-wrap:normal]"
                style={{ "--title-size": `clamp(2rem, calc(100cqi / ${getTitleFitFactor(study.client)}), 6.4rem)` }}
              >
                {study.client}
              </h1>
              {meta.length ? (
                <p className="mt-5 text-xs font-bold uppercase leading-5 tracking-[0.18em] text-white/55">{meta.join(" · ")}</p>
              ) : null}
              <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-300">{study.summary}</p>
            </div>

            {study.headline ? (
              <div className="min-w-0 border-t-2 border-[#F5EE30] pt-6">
                <p className="font-suifak text-[clamp(4.5rem,12vw,9.5rem)] leading-[0.82] text-[#F5EE30]">
                  <KpiNumber value={study.headline.value} />
                </p>
                <p className="mt-4 text-sm font-bold uppercase tracking-[0.16em] text-white">{study.headline.label}</p>
                {story?.source ? <p className="mt-3 text-xs leading-5 text-white/50">Source: {story.source}</p> : null}
              </div>
            ) : study.live ? (
              <div className="min-w-0 border-t-2 border-[#F5EE30] pt-6">
                <a
                  href={study.live.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#F5EE30] transition-colors hover:text-white ${focusRing}`}
                >
                  {study.live.label}
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </div>
            ) : null}
          </div>

          {kpis.length ? (
            <dl
              className={`mt-12 grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 ${KPI_COLUMNS[Math.min(kpis.length, 4)]}`}
            >
              {kpis.map((kpi) => (
                <div key={kpi.label} className="flex flex-col-reverse bg-black p-5 sm:p-6">
                  <dt className="mt-2 text-sm leading-6 text-white/60">{kpi.label}</dt>
                  <dd className="text-4xl font-bold tabular-nums text-white">{kpi.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </section>

      <section className="px-[var(--site-gutter)] py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[var(--site-content)]">
          <Eyebrow>The Proof</Eyebrow>
          <p className="mt-4 text-3xl font-bold uppercase leading-tight sm:text-4xl">{PROOF_TITLES[study.proof.type]}</p>
          <div className="mt-8">
            <PortfolioProof study={study} size="large" details={!insights.length} />
          </div>
          {insights.length ? (
            <div className="mt-5">
              <PortfolioInsights insights={insights} slug={study.slug} sample={sample} />
            </div>
          ) : null}
          {story?.source && !study.headline ? (
            <p className="mt-4 text-xs leading-5 text-white/50">Source: {story.source}</p>
          ) : null}
        </div>
      </section>

      {story ? (
        <section className="border-t border-white/10 px-[var(--site-gutter)] py-14 sm:py-16 lg:py-24">
          <div className="mx-auto grid max-w-[var(--site-content)] grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)]">
            <aside className="lg:sticky lg:top-8 lg:self-start">
              <Eyebrow>At A Glance</Eyebrow>
              <dl className="mt-5 divide-y divide-white/10 border-y border-white/10">
                {glance.map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 py-3.5 text-sm">
                    <dt className="text-white/50">{label}</dt>
                    <dd className="text-white/90">{value}</dd>
                  </div>
                ))}
              </dl>
              {study.live ? (
                <a
                  href={study.live.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#F5EE30] transition-colors hover:text-white ${focusRing}`}
                >
                  {study.live.label}
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : null}
            </aside>

            <div className="grid min-w-0 grid-cols-1 gap-14">
              <div>
                <Eyebrow>The Challenge</Eyebrow>
                <p className="mt-4 max-w-3xl text-xl leading-9 text-white/90 sm:text-2xl sm:leading-10">{story.challenge}</p>
              </div>

              <div>
                <Eyebrow>What We Did</Eyebrow>
                <ol className="mt-6 grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10">
                  {story.steps.map((step, index) => (
                    <li key={step.title} className="grid gap-4 bg-black p-5 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:p-7">
                      <span className="font-suifak text-4xl leading-none text-[#F5EE30]" aria-hidden="true">
                        {padCount(index + 1)}
                      </span>
                      <div>
                        {step.when ? (
                          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">{step.when}</p>
                        ) : null}
                        <h3 className="text-lg font-bold uppercase leading-snug">{step.title}</h3>
                        <p className="mt-2 text-base leading-7 text-gray-300">{step.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <Eyebrow>The Result</Eyebrow>
                <p className="mt-4 max-w-3xl text-xl leading-9 text-white/90 sm:text-2xl sm:leading-10">{story.result}</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {study.testimonial ? (
        <section className="border-t border-white/10 px-[var(--site-gutter)] py-16 sm:py-20">
          <figure className="mx-auto max-w-4xl">
            <Quote className="h-10 w-10 text-[#F5EE30]" aria-hidden="true" />
            <blockquote className="mt-6 font-suifak text-3xl leading-[1.15] sm:text-5xl">
              <p>“{study.testimonial.quote}”</p>
            </blockquote>
            <figcaption className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-white/60">
              {study.testimonial.name} · {study.testimonial.role}
            </figcaption>
          </figure>
        </section>
      ) : null}

      {showServicePreview ? (
        <section className="border-t border-dashed border-[#F5EE30]/40 bg-[#F5EE30]/[0.03] px-[var(--site-gutter)] py-16 sm:py-20">
          <div className="mx-auto max-w-[var(--site-content)]">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <Eyebrow>Preview Only</Eyebrow>
                <p className="mt-4 text-4xl font-bold uppercase leading-none sm:text-5xl">On The Service Page</p>
              </div>
              <p className="max-w-md text-sm leading-6 text-gray-400">
                {study.status === "published" ? "This is how it shows on " : "Once published, it shows like this on "}
                <Link
                  href={servicePage.href}
                  prefetch={false}
                  className={`font-bold text-white underline decoration-[#F5EE30] underline-offset-4 hover:text-[#F5EE30] ${focusRing}`}
                >
                  {servicePage.href}
                </Link>
                . Samples never show there.
              </p>
            </div>
            <div className="mt-8">
              <CaseStudySpotlight study={study} preview headingLevel="p" />
            </div>
          </div>
        </section>
      ) : null}

      {next ? (
        <section className="border-t border-white/10 px-[var(--site-gutter)] py-16 sm:py-20">
          <div className="mx-auto max-w-[var(--site-content)]">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Eyebrow>Next Case Study</Eyebrow>
                <p className="mt-4 text-4xl font-bold uppercase leading-none sm:text-5xl">Keep Going</p>
              </div>
              <Link
                href={portfolioHref}
                prefetch={false}
                className={`inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#F5EE30] transition-colors hover:text-white ${focusRing}`}
              >
                All Work
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-8">
              <PortfolioCaseCard study={next} preview={preview} media="poster" />
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-t border-white/10 bg-[#F5EE30] px-[var(--site-gutter)] py-14 text-black sm:py-16 lg:py-20">
        <div className="mx-auto grid max-w-[var(--site-content)] gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-black/60 sm:text-sm">
              Start A Conversation
            </p>
            <p className="mt-4 max-w-3xl text-4xl font-bold uppercase leading-[0.95] sm:text-5xl lg:text-6xl">
              Want results like these?
            </p>
            <p className="mt-5 max-w-xl text-base leading-7 text-black/75">
              Tell us what you want to grow, and we will show you where we would start.
            </p>
          </div>
          <Link
            href="/contact"
            prefetch={false}
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-black px-7 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
          >
            Start A Project
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
