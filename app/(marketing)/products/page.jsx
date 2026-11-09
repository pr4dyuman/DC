import Link from "next/link";
import { ArrowRight } from "lucide-react";

import ProductCards from "@/components/marketing/ProductCards";
import { getMarketingContactHref } from "@/lib/marketing-contact";
import {
  buildMarketingMetadata,
  getMarketingBreadcrumbJsonLd,
  serializeMarketingJsonLd,
} from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Products by Digital Corvids: Agency OS, Templates, zSEO.ai",
  description:
    "Software and ready-made websites from the Digital Corvids team: Agency OS to run an agency, website templates, and zSEO.ai for SEO content.",
  path: "/products",
  keywords: ["Digital Corvids products", "Agency OS", "agency management software", "website templates", "zSEO.ai"],
});

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

const structuredData = [
  getMarketingBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Products", path: "/products" },
  ]),
];

export default function ProductsPage() {
  return (
    <main className="bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeMarketingJsonLd(structuredData) }}
      />

      <section className="border-b border-white/10 px-[var(--site-gutter)] pb-10 pt-10 sm:pb-12 sm:pt-12 lg:pb-14 lg:pt-14">
        <div className="mx-auto grid max-w-[var(--site-content)] gap-8 lg:grid-cols-[0.98fr_0.62fr] lg:items-end">
          <div>
            <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30]">Made By Digital Corvids</p>
            <h1 className="mt-5 max-w-4xl font-suifak text-[clamp(3.1rem,7.2vw,6.4rem)] uppercase leading-[0.86]">
              Products
            </h1>
          </div>
          <p className="m-0 max-w-xl border-t border-white/15 pt-6 text-base leading-7 text-gray-300 sm:text-lg lg:justify-self-end">
            Software and ready-made websites built by our team. Agency OS and the templates are part of this website;
            zSEO.ai has its own.
          </p>
        </div>
      </section>

      <section className="px-[var(--site-gutter)] py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[var(--site-content)]">
          <h2 className="sr-only">Our products</h2>
          <ProductCards headingLevel="h3" />
        </div>
      </section>

      {/* Most visitors come for marketing help, so point them back to it. */}
      <section className="px-[var(--site-gutter)] pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto flex max-w-[var(--site-content)] flex-col gap-6 border-t border-white/15 pt-10 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">
              Looking For Marketing Help?
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-bold uppercase leading-[0.95] sm:text-5xl">
              We also run SEO, ads, social media and websites for businesses.
            </h2>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Link
              href={getMarketingContactHref({ intent: "plan" })}
              prefetch={false}
              className={`inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#F5EE30] px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-white ${focusRing}`}
            >
              Get A Free Marketing Plan
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/services"
              prefetch={false}
              className={`inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-full border border-white/20 px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition-colors hover:border-[#F5EE30] hover:text-[#F5EE30] ${focusRing}`}
            >
              See Our Services
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
