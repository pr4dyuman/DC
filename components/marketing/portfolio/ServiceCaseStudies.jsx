import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { loadServiceCaseStudies } from "@/lib/marketing-portfolio-store";

import CaseStudySpotlight from "./CaseStudySpotlight";
import PortfolioCaseCard from "./PortfolioCaseCard";

// Published case studies on a service page: results-led work as a spotlight
// with its charts and visuals, website projects as cards. Renders nothing until
// the service has a published case study, so service pages never show an empty
// section or sample numbers. Case studies are managed in Super Admin.
export default async function ServiceCaseStudies({ services, title, linkLabel }) {
  const studies = (await loadServiceCaseStudies(services)).slice(0, 4);
  if (!studies.length) {
    return null;
  }

  const spotlights = studies.filter((study) => study.proof.type !== "website").slice(0, 2);
  const cards = studies.filter((study) => study.proof.type === "website").slice(0, 3);

  return (
    <section className="mb-20 lg:mb-32">
      <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[#F5EE30]" aria-hidden="true"></span>
            <span className="font-glacial-bold text-sm uppercase tracking-widest text-white">From The Portfolio</span>
          </div>
          <h2 className="text-3xl font-extrabold uppercase leading-tight md:text-5xl">
            <span className="text-white">{title}</span>
            <br />
            <span className="text-[#3E3E3E]">We Have Delivered</span>
          </h2>
        </div>
        <Link
          href={`/portfolio?service=${services.join(",")}#work`}
          prefetch={false}
          className="inline-flex shrink-0 items-center gap-2 font-glacial-bold text-sm uppercase tracking-widest text-[#F5EE30] transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {spotlights.length ? (
        <div className="grid grid-cols-1 gap-6">
          {spotlights.map((study) => (
            <CaseStudySpotlight key={study.slug} study={study} />
          ))}
        </div>
      ) : null}

      {cards.length ? (
        <div className={`grid grid-cols-1 gap-5 ${spotlights.length ? "mt-6" : ""} ${cards.length >= 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
          {cards.map((study) => (
            <PortfolioCaseCard key={study.slug} study={study} media="poster" />
          ))}
        </div>
      ) : null}
    </section>
  );
}
