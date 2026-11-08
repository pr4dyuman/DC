import { Check } from "lucide-react";

import { EXAMPLE_MARK } from "@/lib/marketing-portfolio";

import PortfolioInsights from "./insights/PortfolioInsights";
import PortfolioProof from "./proofs/PortfolioProof";
import { EXAMPLE_NOTE } from "./ServiceExampleCard";

// A service's example on its own service page: what the reporting covers,
// beside the visuals marked "Example". Shown until a real case study for the
// service is published.
export default function ServiceExampleSpotlight({ example }) {
  const { study, copy } = example;
  const insights = (study.insights || []).slice(0, 2);

  return (
    <article className="rounded-lg border border-dashed border-white/20 bg-white/[0.015] p-4 sm:p-6 xl:p-8">
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,0.3fr)_minmax(0,0.7fr)] xl:gap-10">
        <div className="flex min-w-0 flex-col">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#F5EE30]">Example</p>
          <h3 className="mt-4 text-3xl font-bold uppercase leading-none sm:text-4xl">{copy.title}</h3>
          <p className="mt-5 text-base leading-7 text-gray-300">{copy.text}</p>
          <ul className="mt-6 space-y-3 border-y border-white/10 py-5">
            {copy.includes.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-6 text-white/85">
                <Check className="mt-1 h-4 w-4 shrink-0 text-[#F5EE30]" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs leading-5 text-white/50">{EXAMPLE_NOTE}</p>
        </div>

        <div className="min-w-0">
          <PortfolioProof study={study} size="large" details={!insights.length} mark={EXAMPLE_MARK} />
          {insights.length ? (
            <div className="mt-5">
              <PortfolioInsights insights={insights} slug={`${study.slug}-example`} sample={EXAMPLE_MARK} />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
