import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { EXAMPLE_MARK } from "@/lib/marketing-portfolio";

import PortfolioProof from "./proofs/PortfolioProof";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

export const EXAMPLE_NOTE = "Example with illustrative numbers, not a client's results.";

// One service's example on the portfolio: the visuals we report it with,
// marked "Example", until a real case study for the service is published.
export default function ServiceExampleCard({ example }) {
  const { service, study, copy } = example;

  return (
    <article
      id={`example-${service.id}`}
      className="@container h-full scroll-mt-28 overflow-hidden rounded-lg border border-dashed border-white/20 bg-white/[0.015]"
    >
      {/* A card that spans the full row goes side by side, like project cards. */}
      <div className="grid h-full @4xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
        <div className="min-w-0 border-b border-dashed border-white/15 bg-[#080808] p-2 @4xl:flex @4xl:items-center @4xl:border-b-0 @4xl:border-r @4xl:p-3">
        <div className="w-full">
          <PortfolioProof study={study} size="card" mark={EXAMPLE_MARK} />
        </div>
      </div>
      <div className="flex min-w-0 flex-col p-5 sm:p-7 @4xl:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#F5EE30]">{service.label}</p>
        <h3 className="mt-3 text-2xl font-bold uppercase leading-tight sm:text-3xl">{copy.title}</h3>
        <p className="mt-3 text-sm leading-6 text-gray-300 sm:text-base sm:leading-7">{copy.text}</p>
        <p className="mt-4 text-xs leading-5 text-white/50">{EXAMPLE_NOTE}</p>
        <div className="mt-auto pt-7">
          <Link
            href={service.href}
            prefetch={false}
            className={`inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#F5EE30] transition-colors hover:text-white ${focusRing}`}
          >
            About the service
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">: {service.label}</span>
          </Link>
        </div>
      </div>
      </div>
    </article>
  );
}
