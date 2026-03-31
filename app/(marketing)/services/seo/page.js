import Image from "next/image"
import Link from "next/link"
export default function SEOServices() {
  return (
    <div className="min-h-screen bg-black text-white">

      <div className="max-w-7xl mx-auto px-6 pt-4 sm:pt-6 md:pt-8 pb-8 sm:pb-10 md:pb-12">
        {/* Header Section */}
        <div className="text-center mb-16">
          <Link href="/services">
            <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-wide mb-4 cursor-pointer">
              SERVICES
            </h2>
          </Link>

          <p className="text-white font-glacial-bold text-sm md:text-base uppercase  tracking-wider">
            <Link href="/services" className="text-white hover:text-[#F5EE30] transition-colors">
              SERVICES
            </Link>
            <span className="text-gray-500 mx-2">|</span>
            <span className="text-[#3E3E3E] font-glacial-bold">SEO</span>
          </p>
        </div>

        {/* First Section - SEO (Text Left, Image Right) */}
        <div className="flex flex-col lg:flex-row items-center justify-between mb-20 lg:mb-32">
          {/* Left - Text Content */}
          <div className="w-full lg:w-1/2 lg:pr-12 order-2 lg:order-1">
            <p className="text-white text-sm font-glacial-bold mb-4 uppercase tracking-wide text-left">
              DOMINATE GOOGLE, DRIVE ORGANIC GROWTH, AND OUTRANK THE COMPETITION
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[#F5EE30] text-left">SEARCH ENGINE OPTIMIZATION</h2>
            <h4 className="text-xl font-glacial-bold mb-4 text-white text-left">OUR MISSION</h4>
            <p className="text-white mb-6 leading-relaxed text-lg text-left">
              To enhance our client&apos;s online visibility and drive meaningful organic growth through strategic
              optimization that delivers lasting results aligned with their business goals.
            </p>
            <h4 className="text-xl font-glacial-bold mb-4 text-white text-left">OUR VISION</h4>
            <p className="text-white leading-relaxed text-lg text-left">
              We envision a digital landscape where every business has the opportunity to thrive online through targeted
              SEO strategies that create sustainable organic growth.
            </p>
          </div>

          {/* Right - Image */}
          <div className="w-full lg:w-1/2 flex justify-center mb-8 lg:mb-0 lg:pl-12 order-1 lg:order-2">
            <div className="relative">
              <Image src="/web4.svg" alt="SEO Illustration" width={400} height={400} className="max-w-full h-auto" />
            </div>
          </div>
        </div>

        {/* Second Section - Technical SEO (Image Left, Text Right) */}
        <div className="flex flex-col lg:flex-row items-center justify-between mb-20 lg:mb-32">
          {/* Left - Image */}
          <div className="w-full lg:w-1/2 flex justify-center mb-8 lg:mb-0 lg:pr-12 order-1 lg:order-1">
            <div className="relative">
              <Image
                src="/seo2.svg"
                alt="Technical SEO Illustration"
                width={500}
                height={400}
                className="max-w-full h-auto"
              />
            </div>
          </div>

          {/* Right - Text Content */}
          <div className="w-full lg:w-1/2 lg:pl-12 order-2 lg:order-2">
            <p className="text-white text-sm font-glacial-bold mb-4 uppercase tracking-wide text-left lg:text-right">
              WE BUILD WEBSITES THAT GOOGLE LOVES. SPEED, SECURITY, AND TECHNICAL EXCELLENCE FOR TOP RANKINGS.
            </p>
            <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-6 text-left lg:text-right">
              <span className="text-white">TECHNICAL SEO</span>
              <br />
              <span className="text-[#3E3E3E]"> OPTIMIZATION</span>
            </h2>

            <p className="text-white mb-6 leading-relaxed text-lg text-left lg:text-right">
              Our Technical SEO team ensures your website meets all search engine requirements for optimal crawling,
              indexing, and ranking performance.
            </p>
            <ul className="space-y-3 text-white text-lg">
              <li className="flex items-start lg:justify-end">
                <span className="text-[#F5EE30] mr-3 lg:ml-3 lg:mr-0 lg:order-2">•</span>
                <span className="lg:order-1">Website Speed & Core Web Vitals</span>
              </li>
              <li className="flex items-start lg:justify-end">
                <span className="text-[#F5EE30] mr-3 lg:ml-3 lg:mr-0 lg:order-2">•</span>
                <span className="lg:order-1">Mobile-First Indexing Optimization</span>
              </li>
              <li className="flex items-start lg:justify-end">
                <span className="text-[#F5EE30] mr-3 lg:ml-3 lg:mr-0 lg:order-2">•</span>
                <span className="lg:order-1">Schema Markup Implementation</span>
              </li>
              <li className="flex items-start lg:justify-end">
                <span className="text-[#F5EE30] mr-3 lg:ml-3 lg:mr-0 lg:order-2">•</span>
                <span className="lg:order-1">XML Sitemaps & Robots.txt</span>
              </li>
              <li className="flex items-start lg:justify-end">
                <span className="text-[#F5EE30] mr-3 lg:ml-3 lg:mr-0 lg:order-2">•</span>
                <span className="lg:order-1">SSL Security & HTTPS Migration</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Keyword Research Section (Text Left, Image Right) */}
        <div className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20 lg:mb-32">
          {/* Left - Text */}
          <div className="w-full order-2 lg:order-1 text-left">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-2 h-2 bg-[#F5EE30] rounded-full"></span>
              <span className="uppercase tracking-widest text-sm font-glacial-bold text-white">
                PIXEL-PERFECT WEBSITES THAT ADAPT SEAMLESSLY TO ANY DEVICE
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-6 text-left">
              <span className="text-white">KEYWORD RESEARCH</span>
              <br />
              <span className="text-[#3E3E3E]">& CONTENT OPTIMIZATION</span>
            </h2>
            <ul className="space-y-3 text-white text-lg">
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-3">•</span>Comprehensive keyword research & competitor analysis
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-3">•</span>Content strategy development & optimization
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-3">•</span>On-page SEO optimization
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-3">•</span>Content clusters and topic authority
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-3">•</span>Long-tail keyword targeting & strategy
              </li>
            </ul>
          </div>

          {/* Right - Image */}
          <div className="w-full flex justify-center order-1 lg:order-2">
            <div className="relative">
              <Image
                src="/seo3.svg"
                alt="Keyword research illustration"
                width={400}
                height={400}
                className="max-w-full h-auto"
              />
            </div>
          </div>
        </div>

        {/* Local SEO Section (Image Left, Text Right) */}
        <div className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20 lg:mb-32">
          {/* Left - Image */}
          <div className="w-full flex justify-center order-1 lg:order-1">
            <div className="relative">
              <Image src="/seo4.svg" alt="Local SEO illustration" width={400} height={400} className="max-w-full h-auto" />
            </div>
          </div>

          {/* Right - Text */}
          <div className="w-full order-2 lg:order-2 text-left lg:text-right">
            {/* Heading Line */}
            <div className="mb-4 lg:text-right">
              <div className="flex items-start">
                <span className="text-[#F5EE30] mr-3">•</span>
                <span className="uppercase tracking-widest text-sm font-glacial-bold text-white">
                  BE THE #1 CHOICE IN YOUR LOCATION - DOMINATE YOUR LOCAL MARKET AND GET THE PHONE RINGING
                </span>
              </div>
            </div>

            {/* Title */}
            <div className="text-start md:text-end">
              {/* Title */}
              <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-2">
                TECHNICAL SEO
              </h2>
              <h3 className="text-3xl md:text-5xl font-extrabold text-[#3E3E3E] mb-8">
                OPTIMIZATION
              </h3>

              {/* List */}
              <ul className="list-disc list-outside text-left inline-block pl-6 space-y-3 text-white text-lg marker:text-[#F5EE30]">
                <li className="pl-2">
                  Core Web Vitals optimization (LCP, FID, CLS)
                </li>
                <li className="pl-2">
                  Mobile-first indexing and responsive design fixes
                </li>
                <li className="pl-2">
                  XML sitemap generation + crawl error resolution
                </li>
                <li className="pl-2">
                  Schema markup integration for rich snippets
                </li>
                <li className="pl-2">
                  HTTPS migration and duplicate content cleanup
                </li>
              </ul>

            </div>

          </div>
        </div>


        {/* Link Building Section (Text Left, Image Right) */}
        <div className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20 lg:mb-32">
          {/* Left - Text */}
          <div className="w-full order-2 lg:order-1 text-left">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-2 h-2 bg-[#F5EE30] rounded-full"></span>
              <span className="uppercase tracking-widest  font-glacial-bold text-sm text-white">
                Strategic authority building for sustainable ranking growth
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-6 text-left">
              <span className="text-white">LINK BUILDING</span>
              <br />
              <span className="text-[#3E3E3E]">& AUTHORITY</span>
            </h2>
            <ul className="space-y-3 text-white text-lg">
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-3">•</span>High-Quality Backlink Acquisition
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-3">•</span>Guest Posting & Content Outreach
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-3">•</span>Broken Link Building Strategies
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-3">•</span>Competitor Backlink Analysis
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-3">•</span>Domain Authority Improvement
              </li>
            </ul>
          </div>

          {/* Right - Image */}
          <div className="w-full flex justify-center order-1 lg:order-2">
            <div className="relative">
              <Image
                src="/seo5.svg"
                alt="Link building illustration"
                width={400}
                height={400}
                className="max-w-full h-auto"
              />
            </div>
          </div>
        </div>

      </div>
      {/* Why Choose Us Section */}
      <div className="bg-black text-white w-full">

        {/* Title */}
        <h2
          className="text-3xl md:text-4xl font-bold text-center text-black py-4"
          style={{ backgroundColor: "#F5EE30" }}
        >
          WHY CHOOSE US
        </h2>

        {/* Features Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center py-10 px-6">
          <div className="px-2">
            <h3 className="text-base sm:text-lg md:text-xl font-bold">DATA-DRIVEN APPROACH</h3>
            <p className="text-xs sm:text-sm md:text-base mt-2 text-gray-300 leading-relaxed">
              We base every SEO decision on data analysis and proven strategies.
            </p>
          </div>

          <div className="px-2">
            <h3 className="text-base sm:text-lg md:text-xl font-bold">PROVEN EXPERTISE</h3>
            <p className="text-xs sm:text-sm md:text-base mt-2 text-gray-300 leading-relaxed">
              Our SEO specialists have years of experience across industries.
            </p>
          </div>

          <div className="px-2">
            <h3 className="text-base sm:text-lg md:text-xl font-bold">WHITE-HAT TECHNIQUES</h3>
            <p className="text-xs sm:text-sm md:text-base mt-2 text-gray-300 leading-relaxed">
              We use Google-approved SEO methods that ensure long-term success.
            </p>
          </div>

          <div className="px-2">
            <h3 className="text-base sm:text-lg md:text-xl font-bold">TRANSPARENT REPORTING</h3>
            <p className="text-xs sm:text-sm md:text-base mt-2 text-gray-300 leading-relaxed">
              Get monthly reports showing improvements in traffic and conversions.
            </p>
          </div>
        </div>




        {/* Transform Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-10 px-6 md:px-16 pb-12 mt-4">

          <div className="text-center md:text-left max-w-xl">
            <h3 className="text-2xl md:text-3xl font-extrabold leading-snug">
              READY TO DOMINATE <br />
              <span className="text-gray-400">GOOGLE SEARCH RESULTS?</span>
            </h3>
            <p className="text-sm md:text-base mt-3 text-gray-400 leading-relaxed">
              Let&apos;s discuss how our proven SEO strategies can help you outrank competitors and drive qualified organic traffic.
            </p>
          </div>

          {/* Circle Button */}
          <div className="flex justify-center md:justify-end">
            <a href="/get-started" className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-white text-black font-bold flex items-center justify-center shadow-lg hover:bg-yellow-400 transition-all">GET STARTED</a>
          </div>
        </div>
      </div>
      <div className="bg-black text-white w-full py-10">
        <h2
          className="text-3xl md:text-4xl font-bold text-center text-black py-4"
          style={{ backgroundColor: "#F5EE30" }}
        >
          STATS THAT MATTER
        </h2>

        <div className="relative w-full flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-6xl flex flex-col md:flex-row items-center md:justify-between text-center gap-10">

            {/* Stat */}
            <div className="flex flex-col items-center flex-1">
              <p className="text-sm md:text-base font-light text-gray-300 leading-relaxed">
                Average 300% increase in organic traffic within 12 months.
              </p>
              <div className="w-full md:hidden h-[2px] bg-[#F5EE30] mt-4"></div>
            </div>

            {/* Divider (Desktop Only) */}
            <div className="hidden md:block w-[2px] h-16 bg-[#F5EE30]"></div>

            {/* Stat */}
            <div className="flex flex-col items-center flex-1">
              <p className="text-sm md:text-base font-light text-gray-300 leading-relaxed">
                92% client retention rate—we&apos;re in it for the long haul.

              </p>
              <div className="w-full md:hidden h-[2px] bg-[#F5EE30] mt-4"></div>
            </div>

            {/* Divider (Desktop Only) */}
            <div className="hidden md:block w-[2px] h-16 bg-[#F5EE30]"></div>

            {/* Stat */}
            <div className="flex flex-col items-center flex-1">
              <p className="text-sm md:text-base font-light text-gray-300 leading-relaxed">
                First-page rankings for 450+ competitive keywords in 2023.
              </p>
            </div>

          </div>

          <div className="absolute right-8 top-10 hidden md:block">
            <span className="text-[#F5EE30] text-6xl font-bold">”</span>
          </div>
        </div>
      </div>

      {/* Footer Section */}

    </div>
  )
}


