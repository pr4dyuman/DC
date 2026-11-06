import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

import { getCaseStudyHref, hasCaseStudyPage } from "@/lib/marketing-portfolio";

import KpiNumber from "./KpiNumber";
import ServiceTags from "./ServiceTags";
import PortfolioProof from "./proofs/PortfolioProof";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

function Facts({ study }) {
  if (study.proof.type === "website") {
    const facts = [
      ["Type", study.proof.projectType],
      ["Status", study.proof.status],
    ];

    return (
      <dl className="mt-6 grid grid-cols-2 border-y border-white/10">
        {facts.map(([label, value]) => (
          <div key={label} className="border-r border-white/10 py-4 pr-4 last:border-r-0 last:pl-4 last:pr-0">
            <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">{label}</dt>
            <dd className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-white/80">{value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  if (!study.kpis?.length) {
    return null;
  }

  return (
    <dl className="mt-6 grid grid-cols-2 border-y border-white/10">
      {study.kpis.slice(0, 2).map((kpi) => (
        <div key={kpi.label} className="flex flex-col-reverse border-r border-white/10 py-4 pr-4 last:border-r-0 last:pl-4 last:pr-0">
          <dt className="mt-1.5 text-[11px] leading-4 text-white/55">{kpi.label}</dt>
          <dd className="text-xl font-bold tabular-nums text-white">{kpi.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// One piece of work: its proof visual, the result and a way in. Cards that
// span the full grid width switch to a side-by-side layout (container query).
export default function PortfolioCaseCard({
  study,
  preview = false,
  headingLevel = "h3",
  media = "video",
  priority = false,
}) {
  const Heading = headingLevel;
  const pageHref = hasCaseStudyPage(study) ? getCaseStudyHref(study, { preview }) : null;
  const meta = [study.industry, study.location, study.period].filter(Boolean).join(" · ");

  return (
    <article className="@container group relative h-full overflow-hidden rounded-lg border border-white/10 bg-white/[0.025] transition-colors hover:border-white/25 focus-within:border-white/25">
      <div className="grid h-full @4xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
        <div className="min-w-0 border-b border-white/10 bg-[#080808] p-2 @4xl:flex @4xl:items-center @4xl:border-b-0 @4xl:border-r @4xl:p-3">
          <div className="w-full">
            <PortfolioProof study={study} size="card" media={media} priority={priority} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col p-5 sm:p-7 @4xl:p-8">
          <ServiceTags services={study.services} />
          <Heading className="mt-4 text-3xl font-bold uppercase leading-none sm:text-4xl @4xl:font-suifak @4xl:text-[3.2rem] @4xl:font-normal">
            {pageHref ? (
              <Link
                href={pageHref}
                prefetch={false}
                className="after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-[#F5EE30]"
              >
                {study.client}
              </Link>
            ) : (
              study.client
            )}
          </Heading>
          {meta ? <p className="mt-3 text-xs font-bold uppercase leading-5 tracking-[0.14em] text-white/50">{meta}</p> : null}

          {study.headline ? (
            <div className="mt-6">
              <p className="font-suifak text-[3.25rem] leading-[0.9] text-[#F5EE30] sm:text-6xl">
                <KpiNumber value={study.headline.value} />
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-white/85">{study.headline.label}</p>
            </div>
          ) : null}

          <p className="mt-5 text-sm leading-6 text-gray-300 sm:text-base sm:leading-7">{study.summary}</p>

          <Facts study={study} />

          {study.scope?.length ? (
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2" aria-label="Project scope">
              {study.scope.map((item) => (
                <li key={item} className="text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                  {item}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-auto flex flex-wrap items-center gap-x-7 gap-y-3 pt-8">
            {pageHref ? (
              <span
                className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#F5EE30] transition-colors group-hover:text-white"
                aria-hidden="true"
              >
                Read case study
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            ) : null}
            {study.live ? (
              <a
                href={study.live.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`relative z-10 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] transition-colors hover:text-white ${pageHref ? "text-white/70" : "text-[#F5EE30]"} ${focusRing}`}
              >
                {study.live.label}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
