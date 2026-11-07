import Link from "next/link";
import MobileNavigation from "./MobileNavigation";
import NavigationEnhancer from "./NavigationEnhancer";

const servicesList = [
  { name: "Web Development", href: "/services/web-development" },
  { name: "SEO", href: "/services/seo" },
  { name: "Social Media Marketing", href: "/services/social-media-marketing" },
  { name: "Video Production", href: "/services/video-production-ad" },
  { name: "PPC", href: "/services/ppc" },
  { name: "Influencer Marketing", href: "/services/influencer-marketing" },
  { name: "Manage Company", href: "/services/manage-company" },
  { name: "zSEO.ai", href: "https://zseo.ai" },
];

const workList = [
  { name: "Client Work", href: "/portfolio" },
  { name: "Templates", href: "/templates" },
];

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
          className="flex items-center space-x-3 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
        >
          <span className="text-[#F5EE30] text-5xl sm:text-6xl md:text-7xl font-suifak tracking-tight group-hover:drop-shadow-[0_0_10px_rgba(245,238,48,0.5)] transition-all">
            DC
          </span>
          <span className="text-xl sm:text-2xl font-suifak leading-tight text-white group-hover:text-gray-200 transition-colors">
            Digital <br /> Corvids
          </span>
        </Link>

        {/* Desktop Links */}
        <ul className="hidden lg:flex lg:space-x-6 xl:space-x-12 lg:text-base xl:text-xl font-glacial-bold tracking-wide whitespace-nowrap">
          <li>
            <Link
              href="/"
              prefetch={false}
              data-nav-path="/"
              className="transition-all duration-200 hover:text-[#F5EE30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
            >
              HOME
            </Link>
          </li>
          <li className="relative group">
            <Link
              href="/services"
              prefetch={false}
              data-nav-path="/services"
              className="transition-all duration-200 hover:text-[#F5EE30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
            >
              SERVICES
            </Link>
            {/* Dropdown Menu */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full pt-4 hidden group-hover:block group-focus-within:block w-56">
              <div className="bg-black/50 border border-white/10 shadow-xl rounded-sm overflow-hidden flex flex-col">
                {servicesList.map((service) => (
                  <Link
                    key={service.href}
                    href={service.href}
                    prefetch={false}
                    data-nav-path={service.href}
                    className="px-4 py-3 hover:bg-white/10 hover:text-[#F5EE30] focus-visible:bg-white/10 focus-visible:text-[#F5EE30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#F5EE30] transition-colors border-b border-white/5 last:border-0 text-white"
                  >
                    {service.name}
                  </Link>
                ))}
              </div>
            </div>
          </li>
          <li className="relative group">
            <Link
              href="/portfolio"
              prefetch={false}
              data-nav-path="/portfolio"
              data-nav-prefixes="/portfolio,/templates"
              className="transition-all duration-200 hover:text-[#F5EE30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
            >
              PORTFOLIO
            </Link>
            {/* Dropdown Menu */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full pt-4 hidden group-hover:block group-focus-within:block w-48">
              <div className="bg-black/50 border border-white/10 shadow-xl rounded-sm overflow-hidden flex flex-col">
                {workList.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    data-nav-path={item.href}
                    className="px-4 py-3 hover:bg-white/10 hover:text-[#F5EE30] focus-visible:bg-white/10 focus-visible:text-[#F5EE30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#F5EE30] transition-colors border-b border-white/5 last:border-0 text-white"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </li>
          <li>
            <Link
              href="/blog"
              prefetch={false}
              data-nav-path="/blog"
              className="transition-all duration-200 hover:text-[#F5EE30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
            >
              BLOG
            </Link>
          </li>
          <li>
            <Link
              href="/about"
              prefetch={false}
              data-nav-path="/about"
              className="transition-all duration-200 hover:text-[#F5EE30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
            >
              ABOUT US
            </Link>
          </li>
          <li>
            <a
              href="/login"
              data-auth-nav-link
              data-nav-path="/login"
              data-nav-group="auth"
              className="transition-all duration-200 hover:text-[#F5EE30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
            >
              LOGIN
            </a>
          </li>
        </ul>

        {/* Desktop CTA */}
        <div className="hidden lg:block">
          <Link
            href="/contact"
            prefetch={false}
            className="whitespace-nowrap text-2xl xl:text-4xl font-bold hover:text-[#F5EE30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30] transition-all duration-200 font-etna"
          >
            GET IN TOUCH
          </Link>
        </div>

        <MobileNavigation servicesList={servicesList} />
      </div>
    </nav>
  );
}
