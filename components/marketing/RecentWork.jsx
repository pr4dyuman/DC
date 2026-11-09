import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

import PortfolioProof from "@/components/marketing/portfolio/proofs/PortfolioProof";
import ServiceTags from "@/components/marketing/portfolio/ServiceTags";
import ButtonLink from "@/components/marketing/ui/ButtonLink";
import { MOBILE_SCROLLER, MOBILE_SCROLLER_ITEM, PageSection, SectionIntro } from "@/components/marketing/ui/PageSection";
import { getCaseStudyHref, hasCaseStudyPage, selectCaseStudies } from "@/lib/marketing-portfolio";
import { loadAllCaseStudies } from "@/lib/marketing-portfolio-store";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

// A shorter version of the portfolio card: the visual, the services, the
// client and one line about the work. The full card is on /portfolio.
function RecentWorkCard({ study }) {
  const pageHref = hasCaseStudyPage(study) ? getCaseStudyHref(study) : null;
  const href = pageHref || study.live?.url;
  const external = !pageHref && Boolean(study.live?.url);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.025] transition-colors hover:border-white/25 focus-within:border-white/25">
      <div className="border-b border-white/10 bg-[#080808] p-2">
        <PortfolioProof study={study} size="card" media="poster" />
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <ServiceTags services={study.services} />
        <h3 className="mt-4 text-2xl font-bold uppercase leading-none sm:text-3xl">{study.client}</h3>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-300">{study.summary}</p>
        {href ? (
          external ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-auto inline-flex items-center gap-2 pt-6 text-sm font-bold uppercase tracking-[0.16em] text-[#F5EE30] transition-colors hover:text-white after:absolute after:inset-0 after:content-[''] ${focusRing}`}
            >
              {study.live.label}
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <Link
              href={href}
              prefetch={false}
              className={`mt-auto inline-flex items-center gap-2 pt-6 text-sm font-bold uppercase tracking-[0.16em] text-[#F5EE30] transition-colors group-hover:text-white after:absolute after:inset-0 after:content-[''] ${focusRing}`}
            >
              Read case study
              <span className="sr-only"> about {study.client}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          )
        ) : null}
      </div>
    </article>
  );
}

// Homepage: up to three published projects from the portfolio. Only real,
// published case studies appear here, never the illustrative examples.
export default async function RecentWork() {
  const studies = selectCaseStudies(await loadAllCaseStudies()).slice(0, 3);
  if (!studies.length) {
    return null;
  }

  return (
    <PageSection labelledBy="recent-work">
      <SectionIntro id="recent-work" eyebrow="Our Work" title="Recent" accent="Projects">
        <ButtonLink href="/portfolio" variant="text" arrow>
          See all work
        </ButtonLink>
      </SectionIntro>
      <ul className={`m-0 mt-8 list-none p-0 ${MOBILE_SCROLLER}`}>
        {studies.map((study) => (
          <li key={study.slug} className={MOBILE_SCROLLER_ITEM}>
            <RecentWorkCard study={study} />
          </li>
        ))}
      </ul>
    </PageSection>
  );
}
