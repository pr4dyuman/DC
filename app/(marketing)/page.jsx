import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import AboutAgency from "@/components/marketing/AboutAgency";
import LazyServicesSection from "@/components/marketing/LazyServicesSection";
import ClientPortalSection from "@/components/marketing/ClientPortalSection";
import ProductCards from "@/components/marketing/ProductCards";
import HeroFlightPath from "@/components/marketing/HeroFlightPath";
import HomeRotatingWord from "@/components/marketing/HomeRotatingWord";
import LazyCompanionsSlider from "@/components/marketing/LazyCompanionsSlider";
import LazyTeamSlider from "@/components/marketing/LazyTeamSlider";
import LazyTestimonialSection from "@/components/marketing/LazyTestimonialSection";
import RelatedArticlesSection from "@/components/marketing/RelatedArticlesSection";
import { getMarketingBlogLinks } from "@/lib/marketing-blog-links";
import { getMarketingContactHref } from "@/lib/marketing-contact";
import {
  ToolLogosSlider,
  ServicesTicker,
} from "@/components/marketing/HomeSliders";

// The latest-posts block reads MongoDB, so regenerate the homepage at most
// every 5 minutes instead of only on each deploy.
export const revalidate = 300;

const HeroSection = async () => {
  const latestPosts = (await getMarketingBlogLinks()).slice(0, 3);

  return (
    <main className="font-glacial text-white bg-black">
      <div className="px-[var(--site-gutter)]">
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

      {/* Content Section */}
      <section className="bg-black px-[var(--site-gutter)] py-4 sm:py-6 md:py-8 justify-start">
        {/* Stats Container */}
        <div className="mx-auto flex max-w-[var(--site-content)] flex-row justify-start items-start gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12 md:mb-16">
          <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 flex-shrink-0">
            <div className="w-full h-full rounded-full p-1.5">
              <div className="w-full h-full flex items-top justify-end">
                <Image
                  src="/home1.svg"
                  alt="Track Icon"
                  width={144}
                  height={144}
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28"
                />
              </div>
            </div>
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm sm:text-base md:text-lg lg:text-xl font-glacial-bold uppercase tracking-wide mb-2">
              SMART STRATEGIES, BOLD RESULTS.
            </p>
            <p className="text-gray-300 text-xs sm:text-sm md:text-base leading-relaxed max-w-xl">
              At Digital Corvids, we blend creativity with data to build powerful digital marketing{" "}
              <br className="hidden sm:block" />
              campaigns that elevate your brand, engage your audience, and drive real results.{" "}
              <br className="hidden sm:block" />
              From{" "}
              <Link
                href="/services/seo"
                prefetch={false}
                className="text-[#F5EE30] underline underline-offset-4 hover:text-white"
              >
                SEO
              </Link>{" "}
              to{" "}
              <Link
                href="/services/social-media-marketing"
                prefetch={false}
                className="text-[#F5EE30] underline underline-offset-4 hover:text-white"
              >
                social media
              </Link>
              , we turn ideas into impact
            </p>
          </div>
        </div>
      </section>

      {/* Logos of the tools we work with */}
      <section className="w-full bg-black py-10">
        <div className="text-center max-w-6xl mx-auto px-4 mb-8">
          <p className="text-gray-400 text-lg sm:text-xl font-glacial-bold uppercase tracking-widest">
            Tools We Work With
          </p>
        </div>
        <ToolLogosSlider />
      </section>

      <LazyServicesSection />

      {/* What working with us looks like: every client's Agency OS portal */}
      <ClientPortalSection />

      <AboutAgency />

      {/* New Auto-Width Services Slider */}
      <section className="w-full bg-[#F5EE30] py-4 overflow-hidden">
        <div className="w-full">
          <ServicesTicker />
        </div>
      </section>

      <LazyTestimonialSection />

      {latestPosts.length > 0 && (
        <div className="mx-auto max-w-[var(--site-frame)] px-[var(--site-gutter)] pt-16">
          <RelatedArticlesSection
            eyebrow="From The Blog"
            title="Latest Articles"
            articles={latestPosts}
            actionLabel="Read Article"
          />
        </div>
      )}

      {/* Logos of clients we have worked with */}
      <section className="bg-black py-12 w-full overflow-hidden">
        <div className="text-center mb-10">
          <p className="text-gray-400 text-lg sm:text-xl font-glacial-bold uppercase tracking-widest">
            Brands We&apos;ve Worked With
          </p>
        </div>
        <div className="w-full">
          <LazyCompanionsSlider />
        </div>
      </section>
      <LazyTeamSlider />

      {/* Our products, kept apart from the services above */}
      <section aria-labelledby="home-products-heading" className="bg-black px-[var(--site-gutter)] pb-16 pt-4 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-[var(--site-content)] border-t border-white/10 pt-12 sm:pt-16">
          <div className="mb-8 flex flex-col gap-5 sm:mb-10 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-sm bg-[#F5EE30]"></div>
                <p className="font-glacial-bold text-sm uppercase tracking-widest text-white sm:text-base">Our Products</p>
              </div>
              <h2 id="home-products-heading" className="text-3xl font-bold uppercase leading-tight text-white sm:text-4xl lg:text-5xl">
                Also Made By <span className="text-[#F5EE30]">Digital Corvids</span>
              </h2>
            </div>
            <Link
              href="/products"
              prefetch={false}
              className="inline-flex items-center gap-2 font-glacial-bold text-sm uppercase tracking-widest text-[#F5EE30] transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
            >
              See all products
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          <ProductCards headingLevel="h3" />
        </div>
      </section>
    </main>
  );
};

export default HeroSection;
