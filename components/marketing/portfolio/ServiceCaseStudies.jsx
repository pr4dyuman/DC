import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getServiceCaseStudies } from "@/lib/marketing-portfolio";

import PortfolioCaseCard from "./PortfolioCaseCard";

// Published case studies on a service page. Renders nothing until the service
// has at least one, so service pages never show an empty section.
export default function ServiceCaseStudies({ services, title, linkLabel }) {
  const studies = getServiceCaseStudies(services).slice(0, 3);
  if (!studies.length) {
    return null;
  }

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
          href={`/portfolio?service=${services[0]}#work`}
          prefetch={false}
          className="inline-flex shrink-0 items-center gap-2 font-glacial-bold text-sm uppercase tracking-widest text-[#F5EE30] transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className={`grid grid-cols-1 gap-5 ${studies.length >= 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        {studies.map((study) => (
          <PortfolioCaseCard key={study.slug} study={study} media="poster" />
        ))}
      </div>
    </section>
  );
}
