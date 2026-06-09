import Link from "next/link";
import { ArrowRight, Check, ExternalLink } from "lucide-react";

import PortfolioProjectGallery from "@/components/marketing/PortfolioProjectGallery";
import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Selected Work | Digital Corvids Portfolio",
  description:
    "Explore selected Digital Corvids website work, including live walkthroughs, external project links, and launch-ready digital experiences.",
  path: "/portfolio",
  keywords: [
    "Digital Corvids portfolio",
    "digital agency portfolio Jaipur",
    "website development portfolio",
    "ecommerce website portfolio",
    "external website projects",
  ],
});

const disciplines = [
  {
    number: "01",
    title: "Websites & Stores",
    description:
      "Responsive business sites, e-commerce storefronts, landing pages, and live web experiences.",
  },
  {
    number: "02",
    title: "SEO & Growth Systems",
    description:
      "Technical foundations, content workflows, measurement, and search-focused improvements.",
  },
  {
    number: "03",
    title: "Content & Campaign Pages",
    description:
      "Editorial systems, campaign assets, social content, and channel-ready creative.",
  },
  {
    number: "04",
    title: "Reporting & Maintenance",
    description:
      "Launch checks, analytics setup, ongoing improvements, and client-ready reporting.",
  },
];

const workingPrinciples = [
  "Clear business purpose",
  "Useful, responsive interfaces",
  "Maintainable systems",
  "Measured improvement",
];

export default function PortfolioPage() {
  return (
    <main className="bg-black text-white">
      <section className="border-b border-white/10 px-6 pb-14 pt-12 sm:pb-16 sm:pt-16 lg:pb-20 lg:pt-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-end">
            <div>
              <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">
                Selected Work
              </p>
              <h1 className="mt-5 max-w-5xl font-suifak text-[clamp(3.4rem,9vw,8rem)] uppercase leading-[0.84]">
                Built By
                <br />
                Digital Corvids
              </h1>
            </div>

            <div className="max-w-xl lg:justify-self-end">
              <p className="text-base leading-7 text-gray-300 sm:text-lg">
                A growing collection of external website projects with live
                walkthroughs, launch context, and direct links to the work.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="#selected-projects"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#F5EE30] px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
                >
                  Explore Work
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/contact"
                  prefetch={false}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition-colors hover:border-[#F5EE30] hover:text-[#F5EE30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
                >
                  Start A Project
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12 grid border-y border-white/10 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
            {workingPrinciples.map((principle) => (
              <div
                key={principle}
                className="flex min-h-16 items-center gap-3 border-b border-white/10 py-4 sm:[&:nth-child(n+3)]:border-b-0 lg:border-b-0 lg:border-r lg:px-5 lg:first:pl-0 lg:last:border-r-0"
              >
                <Check className="h-4 w-4 shrink-0 text-[#F5EE30]" aria-hidden="true" />
                <span className="text-sm font-bold uppercase tracking-[0.12em] text-white/85">
                  {principle}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PortfolioProjectGallery />

      <section className="border-y border-white/10 bg-[#F5EE30] px-6 py-14 text-black sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div>
              <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-black/55 sm:text-sm">
                Across The Work
              </p>
              <h2 className="mt-4 max-w-xl text-4xl font-bold uppercase leading-[0.96] sm:text-5xl lg:text-6xl">
                Different outputs. One connected approach.
              </h2>
            </div>

            <div className="grid border-t border-black/20 sm:grid-cols-2">
              {disciplines.map((discipline) => (
                <article
                  key={discipline.number}
                  className="border-b border-black/20 py-6 sm:min-h-52 sm:px-6 sm:odd:border-r sm:first:pl-0"
                >
                  <p className="text-xs font-bold tracking-[0.24em] text-black/45">
                    {discipline.number}
                  </p>
                  <h3 className="mt-5 text-xl font-bold uppercase leading-tight">
                    {discipline.title}
                  </h3>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-black/70">
                    {discipline.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl border-t border-white/15 pt-10">
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
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-white px-7 py-4 text-sm font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5EE30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
            >
              Discuss Your Project
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
