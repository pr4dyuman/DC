import Image from "next/image";
import Link from "next/link";
import AboutAgency from "@/components/marketing/AboutAgency";
import LazyServicesSection from "@/components/marketing/LazyServicesSection";
import ManageCompanySection from "@/components/marketing/ManageCompany";
import HeroBackground from "@/components/marketing/HeroBackground";
import HomeRotatingWord from "@/components/marketing/HomeRotatingWord";
import LazyCompanionsSlider from "@/components/marketing/LazyCompanionsSlider";
import LazyTeamSlider from "@/components/marketing/LazyTeamSlider";
import LazyTestimonialSection from "@/components/marketing/LazyTestimonialSection";
import RelatedArticlesSection from "@/components/marketing/RelatedArticlesSection";
import { getMarketingBlogLinks } from "@/lib/marketing-blog-links";
import {
  DigitalPartnersSlider,
  ServicesTicker,
} from "@/components/marketing/HomeSliders";

// The latest-posts block reads MongoDB, so regenerate the homepage at most
// once an hour instead of only on each deploy.
export const revalidate = 3600;

const HeroSection = async () => {
  const latestPosts = (await getMarketingBlogLinks()).slice(0, 3);

  return (
    <div className="font-glacial text-white bg-black">
      <section className="relative overflow-hidden mx-4 sm:mx-6 md:mx-8 lg:mx-10 xl:mx-12 pt-12 sm:pt-16 md:pt-20 text-center flex items-center justify-start min-h-[300px] sm:min-h-[350px] md:min-h-[400px] lg:min-h-[450px]">
        {/* Animated canvas background */}
        <HeroBackground />

        <div className="relative z-10 w-full px-4 sm:px-6 md:px-8 lg:px-10">
          <h1 className="text-start font-semibold tracking-wider uppercase">
            <span className="block text-white text-[clamp(1.5rem,6vw,5rem)] leading-[0.9]">
              EMPOWERING BRANDS WITH
            </span>

            {/* SINGLE LIFT-UP TEXT ANIMATION */}
            <span className="block relative h-[1.2em] overflow-hidden text-[clamp(1.5rem,6vw,5rem)] leading-[1] mt-1 sm:mt-2 font-bold text-[#F5EE30]">
              <HomeRotatingWord />
            </span>
          </h1>
        </div>
      </section>

      {/* Content Section */}
      <section className="bg-black px-4 sm:px-6 md:px-10 lg:px-2 py-4 sm:py-6 md:py-8 justify-start">
        {/* Stats Container */}
        <div className="flex flex-row justify-start items-start gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12 md:mb-16">
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
              At Digital Corvids, we blend creativity with data to build powerful digital marketing
              <br className="hidden sm:block" />
              campaigns that elevate your brand, engage your audience, and drive real results
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

      {/* Manage Company Section — Agency OS Showcase */}
      <ManageCompanySection />

      {/* Infinite Image Slider (DC Camp) */}
      <section className="w-full bg-black py-10">
        <div className="text-center max-w-6xl mx-auto px-4 mb-8">
          <p className="text-gray-400 text-lg sm:text-xl font-glacial-bold uppercase tracking-widest">
            Our Digital Partners
          </p>
        </div>
        <DigitalPartnersSlider />
      </section>

      <LazyServicesSection />
      <AboutAgency />

      {/* New Auto-Width Services Slider */}
      <section className="w-full bg-[#F5EE30] py-4 overflow-hidden">
        <div className="w-full">
          <ServicesTicker />
        </div>
      </section>

      <LazyTestimonialSection />

      {latestPosts.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
          <RelatedArticlesSection
            eyebrow="From The Blog"
            title="Latest Articles"
            articles={latestPosts}
            actionLabel="Read Article"
          />
        </div>
      )}

      {/* Commands Slider Moved Here */}
      <section className="bg-black py-12 w-full overflow-hidden">
        <div className="text-center mb-10">
          <p className="text-gray-400 text-lg sm:text-xl font-glacial-bold uppercase tracking-widest">
            Our Digital Companions
          </p>
        </div>
        <div className="w-full">
          <LazyCompanionsSlider />
        </div>
      </section>
      <LazyTeamSlider />
    </div>
  );
};

export default HeroSection;
