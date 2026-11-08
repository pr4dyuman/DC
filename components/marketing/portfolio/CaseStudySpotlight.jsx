import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getCaseStudyHref, getStudyMark, hasCaseStudyPage } from "@/lib/marketing-portfolio";

import KpiNumber from "./KpiNumber";
import ServiceTags from "./ServiceTags";
import PortfolioInsights from "./insights/PortfolioInsights";
import PortfolioProof from "./proofs/PortfolioProof";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

// One case study on a service page: the result and story in brief beside its
// main proof and first two insights, with a way into the full case study.
export default function CaseStudySpotlight({ study, preview = false, headingLevel = "h3" }) {
  const Heading = headingLevel;
  const mark = getStudyMark(study);
  const href = hasCaseStudyPage(study) ? getCaseStudyHref(study, { preview }) : null;
  const insights = (study.insights || []).slice(0, 2);
  const meta = [study.industry, study.location, study.period].filter(Boolean).join(" · ");

  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.02] p-4 sm:p-6 xl:p-8">
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,0.3fr)_minmax(0,0.7fr)] xl:gap-10">
        <div className="flex min-w-0 flex-col">
          <ServiceTags services={study.services} />
          <Heading className="mt-4 text-3xl font-bold uppercase leading-none sm:text-4xl">{study.client}</Heading>
          {meta ? <p className="mt-3 text-xs font-bold uppercase leading-5 tracking-[0.14em] text-white/50">{meta}</p> : null}

          {study.headline ? (
            <div className="mt-6">
              <p className="font-suifak text-6xl leading-[0.9] text-[#F5EE30]">
                <KpiNumber value={study.headline.value} />
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-white/85">{study.headline.label}</p>
            </div>
          ) : null}

          <p className="mt-5 text-base leading-7 text-gray-300">{study.summary}</p>

          {study.kpis?.length ? (
            <dl className="mt-6 grid grid-cols-2 border-y border-white/10">
              {study.kpis.slice(0, 2).map((kpi) => (
                <div key={kpi.label} className="flex flex-col-reverse border-r border-white/10 py-4 pr-4 last:border-r-0 last:pl-4 last:pr-0">
                  <dt className="mt-1.5 text-[11px] leading-4 text-white/55">{kpi.label}</dt>
                  <dd className="text-xl font-bold tabular-nums text-white">{kpi.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {href ? (
            <Link
              href={href}
              prefetch={false}
              className={`mt-auto inline-flex items-center gap-2 pt-8 text-sm font-bold uppercase tracking-[0.16em] text-[#F5EE30] transition-colors hover:text-white ${focusRing}`}
            >
              Read the full case study
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">: {study.client}</span>
            </Link>
          ) : null}
        </div>

        <div className="min-w-0">
          <PortfolioProof study={study} size="large" details={!study.insights?.length} />
          {insights.length ? (
            <div className="mt-5">
              <PortfolioInsights insights={insights} slug={`${study.slug}-spotlight`} sample={mark} />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
