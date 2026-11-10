import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

import { MOBILE_SCROLLER, MOBILE_SCROLLER_ITEM } from "@/components/marketing/ui/PageSection";
import { MARKETING_PRODUCTS } from "@/lib/marketing-products";
import { getLowestMarketingTemplatePrice } from "@/lib/marketing-templates";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

function getProductNote(product) {
  if (product.id === "agency-os") return "7-day free trial";
  if (product.id === "templates") return `From $${getLowestMarketingTemplatePrice()}`;
  return "Separate website";
}

// One card per product, on /products and in the homepage's products strip.
// The whole card is clickable through its single link. With `scroller`, phones
// get a row to swipe through instead of a stack (homepage).
export default function ProductCards({ headingLevel = "h3", scroller = false }) {
  const Heading = headingLevel;

  return (
    <ul className={`m-0 list-none p-0 ${scroller ? MOBILE_SCROLLER : "grid gap-5 md:grid-cols-3"}`}>
      {MARKETING_PRODUCTS.map((product) => {
        const linkClass = `mt-auto inline-flex items-center gap-2 pt-8 font-glacial-bold text-sm uppercase tracking-[0.16em] text-white transition-colors group-hover:text-[#F5EE30] after:absolute after:inset-0 after:content-[''] ${focusRing}`;
        const label = (
          <>
            {product.action}
            {product.external ? (
              <>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
              </>
            ) : (
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            )}
          </>
        );

        return (
          <li key={product.id} className={`flex ${scroller ? MOBILE_SCROLLER_ITEM : ""}`}>
            <article className="group relative flex w-full flex-col border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-[#F5EE30]/60 hover:bg-[#F5EE30]/[0.04] sm:p-7">
              <p className="m-0 font-glacial-bold text-xs uppercase tracking-[0.24em] text-[#F5EE30]">
                {getProductNote(product)}
              </p>
              <Heading className="mt-4 text-2xl font-bold uppercase leading-tight text-white sm:text-3xl">
                {product.name}
              </Heading>
              <p className="mt-3 text-sm leading-6 text-gray-300 sm:text-base sm:leading-7">{product.description}</p>
              {product.external ? (
                <a href={product.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {label}
                </a>
              ) : (
                <Link href={product.href} prefetch={false} className={linkClass}>
                  {label}
                </Link>
              )}
            </article>
          </li>
        );
      })}
    </ul>
  );
}
