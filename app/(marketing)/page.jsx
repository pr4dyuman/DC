import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ClientPortalSection from "@/components/marketing/ClientPortalSection";
import CountUp from "@/components/marketing/CountUp";
import HeroFlightPath from "@/components/marketing/HeroFlightPath";
import HomeRotatingWord from "@/components/marketing/HomeRotatingWord";
import HowWeWork from "@/components/marketing/HowWeWork";
import LazyCompanionsSlider from "@/components/marketing/LazyCompanionsSlider";
import LazyTeamSlider from "@/components/marketing/LazyTeamSlider";
import LazyTestimonialSection from "@/components/marketing/LazyTestimonialSection";
import ProductCards from "@/components/marketing/ProductCards";
import RecentWork from "@/components/marketing/RecentWork";
import ServicesTicker from "@/components/marketing/ServicesTicker";
import ServiceShowcase from "@/components/marketing/services/ServiceShowcase";
import ButtonLink from "@/components/marketing/ui/ButtonLink";
import CtaBand from "@/components/marketing/ui/CtaBand";
import { MOBILE_SCROLLER, MOBILE_SCROLLER_ITEM, PageSection, SectionIntro } from "@/components/marketing/ui/PageSection";
import { getMarketingBlogLinks } from "@/lib/marketing-blog-links";
import { getMarketingContactHref } from "@/lib/marketing-contact";

// The figures the About page also shows.
const homeStats = [
  { label: "Happy clients", end: 100, suffix: "+" },
  { label: "Ad spend managed", end: 50, prefix: "\u20b9", suffix: "L+" },
  { label: "Years of experience", end: 5, suffix: "+" },
];

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

// The latest-posts block reads MongoDB, so regenerate the homepage at most
// every 5 minutes instead of only on each deploy.
export const revalidate = 300;

const HeroSection = async () => {
  const latestPosts = (await getMarketingBlogLinks()).slice(0, 3);

  return (
    <main className="bg-black text-white">
      <div className="px-[var(--site-gutter)] font-glacial">
      <section className="relative mx-auto max-w-[var(--site-content)] overflow-hidden [container-type:inline-size]">
        {/* Still grid and a flight path that draws once */}
        <HeroFlightPath />

        {/* The flight path fills the top min(14.88cqw, 200px) of the hero and
            stays above 62% of that band, so the text starts just below it. */}
        <div className="relative z-10 w-full px-4 pb-10 pt-[calc(min(9.2cqw,124px)_+_2rem)] text-start sm:px-6 sm:pb-12 md:px-8 lg:px-10 lg:pb-14">
          <h1 className="font-semibold tracking-wider uppercase">
            <span className="mb-3 block font-glacial-bold text-xs tracking-[0.18em] text-[#F5EE30] sm:mb-4 sm:text-sm sm:tracking-[0.3em]">
              Digital marketing agency in Jaipur
            </span>{" "}
            <span className="block text-white text-[clamp(1.5rem,6vw,5rem)] leading-[0.9]">
              More customers from
            </span>{" "}
            <span className="sr-only">Google search, paid ads, social media, your website, video ads and influencers</span>{" "}

            {/* One service at a time, lifting up (the list above is for screen readers) */}
            <span aria-hidden="true" className="block relative h-[1.45em] overflow-hidden text-[clamp(1.5rem,6vw,5rem)] leading-[1] mt-1 sm:mt-2 font-bold text-[#F5EE30]">
              <HomeRotatingWord />
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-300 sm:mt-6 sm:text-lg md:text-xl">
            We plan and run SEO, Google and Meta ads, social media, websites and video for small and growing
            businesses, and show you the enquiries each one brings in.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
            <Link
              href={getMarketingContactHref({ intent: "plan" })}
              prefetch={false}
              className="group inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-[#F5EE30] px-7 font-glacial-bold text-[15px] uppercase tracking-[0.06em] text-black transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
            >
              Get a free marketing plan
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/portfolio"
              prefetch={false}
              className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-white/25 px-7 font-glacial-bold text-[15px] uppercase tracking-[0.06em] text-white transition-colors hover:border-[#F5EE30] hover:text-[#F5EE30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
            >
              See our work
            </Link>
          </div>
        </div>
      </section>
      </div>

      {/* Trust: the numbers, and brands we have worked with */}
      <section aria-labelledby="home-trust" className="border-y border-white/10 bg-black py-10 sm:py-12">
        <h2 id="home-trust" className="sr-only">Digital Corvids in numbers</h2>
        <div className="px-[var(--site-gutter)]">
          <dl className="m-0 mx-auto grid max-w-[var(--site-content)] grid-cols-3 gap-4 text-center">
            {homeStats.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse">
                <dt className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/50 sm:text-xs">{stat.label}</dt>
                <dd className="m-0 font-suifak text-3xl text-white sm:text-5xl">
                  <CountUp end={stat.end} prefix={stat.prefix} suffix={stat.suffix} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mb-0 mt-10 text-center font-glacial-bold text-xs uppercase tracking-[0.35em] text-white/50">
          Brands we&apos;ve worked with
        </p>
        <div className="mt-4">
          <LazyCompanionsSlider />
        </div>
      </section>

      {/* Services: illustrated cards over the black-and-white desk photo */}
      <section aria-labelledby="home-services" className="bg-black text-white">
        <div className="px-[var(--site-gutter)] pt-14 sm:pt-16 lg:pt-20">
          <div className="mx-auto max-w-[var(--site-content)]">
            <SectionIntro id="home-services" eyebrow="Services" title="Your Growth, Fuelled By" accent="Our Expertise">
              Six services, one team. Not sure where to start? Ask for a free plan and we will suggest the right mix.
              <span className="mt-4 block">
                <ButtonLink href="/services" variant="text" arrow>
                  All services
                </ButtonLink>
              </span>
            </SectionIntro>
          </div>
        </div>
        <ServiceShowcase />
      </section>

      <ServicesTicker />

      <HowWeWork tone="dark" />

      {/* What working with us looks like: every client's Agency OS portal */}
      <ClientPortalSection />

      <RecentWork />

      <LazyTeamSlider />

      <LazyTestimonialSection />

      {latestPosts.length > 0 && (
        <PageSection labelledBy="home-articles">
          <SectionIntro id="home-articles" eyebrow="From The Blog" title="Latest" accent="Articles">
            <ButtonLink href="/blog" variant="text" arrow>
              All articles
            </ButtonLink>
          </SectionIntro>
          <ul className={`m-0 mt-8 list-none p-0 ${MOBILE_SCROLLER}`}>
            {latestPosts.map((post) => (
              <li key={post.href} className={`flex ${MOBILE_SCROLLER_ITEM}`}>
                <Link
                  href={post.href}
                  prefetch={false}
                  className={`group flex w-full flex-col justify-between gap-6 border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-[#F5EE30]/60 hover:bg-[#F5EE30]/[0.04] ${focusRing}`}
                >
                  <span>
                    <span className="block font-glacial-bold text-xs uppercase tracking-widest text-[#F5EE30]">{post.topic}</span>
                    <span className="mt-3 block text-lg font-bold uppercase leading-snug text-white transition-colors group-hover:text-[#F5EE30]">
                      {post.title}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-2 font-glacial-bold text-sm uppercase tracking-widest text-white">
                    Read article
                    <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </PageSection>
      )}

      <CtaBand
        title="Want more"
        accent="customers?"
        image={{ src: "/agency-900.png", alt: "Illustration of the Digital Corvids team celebrating with yellow gears", width: 900, height: 830 }}
        text={"Tell us about your business and goals. We usually reply within 24\u00a0hours with questions and a free plan."}
        primaryLabel="Get a free marketing plan"
        primaryHref={getMarketingContactHref({ intent: "plan" })}
      />

      {/* Our products, kept apart from the services above */}
      <PageSection labelledBy="home-products-heading">
        <SectionIntro id="home-products-heading" eyebrow="Our Products" title="Also Made By" accent="Digital Corvids" accentTone="yellow">
          <ButtonLink href="/products" variant="text" arrow>
            See all products
          </ButtonLink>
        </SectionIntro>
        <div className="mt-8">
          <ProductCards headingLevel="h3" scroller />
        </div>
      </PageSection>
    </main>
  );
};

export default HeroSection;
