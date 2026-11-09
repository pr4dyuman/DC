import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getMarketingContactHref } from "@/lib/marketing-contact";
import { MARKETING_PRODUCTS, MARKETING_PRODUCT_PATH_PREFIXES } from "@/lib/marketing-products";
import MobileNavigation from "./MobileNavigation";
import NavigationEnhancer from "./NavigationEnhancer";

// Services are the marketing work we do for clients. Agency OS, the website
// templates and zSEO.ai are products and live under "Products".
const servicesList = [
  { name: "Web Development", href: "/services/web-development" },
  { name: "SEO", href: "/services/seo" },
  { name: "Social Media Marketing", href: "/services/social-media-marketing" },
  { name: "Video Production", href: "/services/video-production-ad" },
  { name: "PPC", href: "/services/ppc" },
  { name: "Influencer Marketing", href: "/services/influencer-marketing" },
];

const productsList = MARKETING_PRODUCTS.map(({ id, name, href, external, summary }) => ({
  id,
  name,
  href,
  external,
  summary,
}));

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";
const topLinkClass = `transition-all duration-200 hover:text-[#F5EE30] ${focusRing}`;

// Dropdown panels are solid, so the page underneath never shows through.
const dropdownPanel =
  "flex flex-col overflow-hidden rounded-md border border-white/12 bg-[#0c0c0c] shadow-[0_24px_60px_-18px_rgba(0,0,0,0.95)]";
const dropdownItemClass =
  "group/item block border-b border-white/[0.07] px-5 py-4 text-white transition-colors last:border-0 hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#F5EE30]";

function ProductMenuItem({ product }) {
  const content = (
    <>
      <span className="flex items-center gap-1.5 text-base leading-6 transition-colors group-hover/item:text-[#F5EE30]">
        {product.name}
        {product.external ? <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden="true" /> : null}
      </span>
      <span className="mt-1 block whitespace-normal font-glacial text-sm leading-5 tracking-normal text-white/55">
        {product.summary}
      </span>
      {product.external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </>
  );

  if (product.external) {
    return (
      <a href={product.href} target="_blank" rel="noopener noreferrer" className={dropdownItemClass}>
        {content}
      </a>
    );
  }

  return (
    <Link
      href={product.href}
      prefetch={false}
      data-nav-path={product.href}
      data-nav-prefixes={product.href}
      className={dropdownItemClass}
    >
      {content}
    </Link>
  );
}

export default function Navigation() {
  return (
    <nav aria-label="Primary navigation" className="bg-black text-white shadow-md py-6 md:py-7 font-glacial relative z-50">
      <NavigationEnhancer />
      <div className="mx-auto flex max-w-[var(--site-frame)] items-center justify-between px-[var(--site-gutter)]">
        {/* Logo Section */}
        <Link
          href="/"
          prefetch={false}
          aria-label="Digital Corvids home"
          className={`flex items-center space-x-3 group ${focusRing}`}
        >
          <span className="text-[#F5EE30] text-5xl sm:text-6xl md:text-7xl font-suifak tracking-tight group-hover:drop-shadow-[0_0_10px_rgba(245,238,48,0.5)] transition-all">
            DC
          </span>
          <span className="text-xl sm:text-2xl font-suifak leading-tight text-white group-hover:text-gray-200 transition-colors">
            Digital <br /> Corvids
          </span>
        </Link>

        {/* Desktop Links. The logo is the link home, which leaves room for
            Products next to Services on laptop screens. */}
        <ul className="hidden lg:flex lg:space-x-6 xl:space-x-10 lg:text-base xl:text-xl font-glacial-bold tracking-wide whitespace-nowrap">
          <li className="relative group">
            <Link href="/services" prefetch={false} data-nav-path="/services" className={topLinkClass}>
              SERVICES
            </Link>
            {/* Dropdown Menu */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full pt-4 hidden group-hover:block group-focus-within:block w-60">
              <div className={dropdownPanel}>
                {servicesList.map((service) => (
                  <Link
                    key={service.href}
                    href={service.href}
                    prefetch={false}
                    data-nav-path={service.href}
                    className="border-b border-white/[0.07] px-5 py-3 text-base leading-6 text-white transition-colors last:border-0 hover:bg-white/[0.06] hover:text-[#F5EE30] focus-visible:bg-white/[0.06] focus-visible:text-[#F5EE30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#F5EE30]"
                  >
                    {service.name}
                  </Link>
                ))}
              </div>
            </div>
          </li>
          <li>
            <Link
              href="/portfolio"
              prefetch={false}
              data-nav-path="/portfolio"
              data-nav-prefixes="/portfolio"
              className={topLinkClass}
            >
              PORTFOLIO
            </Link>
          </li>
          <li className="relative group">
            <Link
              href="/products"
              prefetch={false}
              data-nav-path="/products"
              data-nav-prefixes={MARKETING_PRODUCT_PATH_PREFIXES.join(",")}
              className={topLinkClass}
            >
              PRODUCTS
            </Link>
            {/* Dropdown Menu */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full pt-4 hidden group-hover:block group-focus-within:block w-80">
              <div className={dropdownPanel}>
                {productsList.map((product) => (
                  <ProductMenuItem key={product.id} product={product} />
                ))}
              </div>
            </div>
          </li>
          <li>
            <Link href="/blog" prefetch={false} data-nav-path="/blog" className={topLinkClass}>
              BLOG
            </Link>
          </li>
          <li>
            <Link href="/about" prefetch={false} data-nav-path="/about" className={topLinkClass}>
              ABOUT US
            </Link>
          </li>
        </ul>

        {/* Desktop: log in (for clients and Agency OS users) and the main call to action */}
        <div className="hidden lg:flex lg:items-center lg:gap-5 xl:gap-8">
          <a
            href="/login"
            data-auth-nav-link
            data-nav-path="/login"
            data-nav-group="auth"
            className={`whitespace-nowrap font-glacial-bold text-sm tracking-wide opacity-75 transition-all duration-200 hover:text-[#F5EE30] hover:opacity-100 ${focusRing}`}
          >
            LOGIN
          </a>
          <Link
            href={getMarketingContactHref()}
            prefetch={false}
            className={`whitespace-nowrap text-2xl xl:text-4xl font-bold hover:text-[#F5EE30] transition-all duration-200 font-etna ${focusRing}`}
          >
            GET IN TOUCH
          </Link>
        </div>

        {/* Phones and tablets: a visible way to get in touch next to the menu.
            Below 360px there is no room beside the logo, so it stays in the menu. */}
        <div className="flex items-center gap-1.5 lg:hidden">
          <Link
            href={getMarketingContactHref()}
            prefetch={false}
            className={`inline-flex min-h-11 items-center rounded-full bg-[#F5EE30] px-3.5 font-glacial-bold text-xs uppercase tracking-[0.08em] text-black transition-colors hover:bg-white max-[360px]:hidden ${focusRing}`}
          >
            Contact
          </Link>
          <MobileNavigation servicesList={servicesList} productsList={productsList} />
        </div>
      </div>
    </nav>
  );
}
