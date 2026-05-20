import Image from "next/image";
import Link from "next/link";
import RelatedArticlesSection from "@/components/marketing/RelatedArticlesSection";
import {
  getMarketingBreadcrumbJsonLd,
  getMarketingServiceJsonLd,
  serializeMarketingJsonLd,
} from "@/lib/marketing-seo";

const ppcFaqs = [
  {
    question: "What is included in Digital Corvids PPC advertising services?",
    answer:
      "Our PPC services can include campaign strategy, keyword and audience research, ad copywriting, creative testing, conversion tracking, bid management, landing page recommendations, and performance reporting.",
  },
  {
    question: "Which advertising platforms do you manage?",
    answer:
      "We can manage campaigns across Google Ads, Microsoft Advertising, Meta ads, LinkedIn ads, YouTube, Shopping, Display, and other paid channels when they fit the business goal.",
  },
  {
    question: "How quickly can PPC campaigns start generating traffic?",
    answer:
      "PPC can start sending traffic as soon as campaigns are approved and live. Strong results still depend on targeting, budget, landing page quality, conversion tracking, and ongoing optimization.",
  },
  {
    question: "How do you measure PPC success?",
    answer:
      "We track metrics that connect ad spend to business outcomes, including conversions, cost per lead, conversion rate, ROAS, wasted spend, lead quality, and campaign-level trends.",
  },
];

const ppcProcessSteps = [
  {
    title: "Research",
    description:
      "Analyze goals, competitors, search demand, audience segments, channel fit, budgets, and conversion paths.",
  },
  {
    title: "Setup",
    description:
      "Build campaign structure, ad groups, keywords, audiences, negative keywords, tracking, and landing page recommendations.",
  },
  {
    title: "Launch",
    description:
      "Publish campaigns with clear testing priorities across copy, creative, bids, placements, devices, and locations.",
  },
  {
    title: "Optimize",
    description:
      "Review performance data, reduce wasted spend, improve quality scores, refine targeting, and scale what converts.",
  },
];

const ppcProofPoints = [
  "Conversion tracking is checked before budget is scaled.",
  "Reports focus on leads, revenue, ROAS, CPL, and wasted spend, not vanity clicks.",
  "Search terms, audiences, placements, and creatives are reviewed for ongoing optimization.",
  "Paid traffic recommendations are connected to landing page UX and conversion quality.",
];

const relatedPpcLinks = [
  {
    title: "Web Development",
    href: "/services/web-development",
    description: "Build landing pages that turn paid clicks into real inquiries.",
  },
  {
    title: "SEO Services",
    href: "/services/seo",
    description: "Balance paid acquisition with compounding organic visibility.",
  },
  {
    title: "Social Media Marketing",
    href: "/services/social-media-marketing",
    description: "Connect paid campaigns with consistent social demand creation.",
  },
  {
    title: "Get Started",
    href: "/get-started",
    description: "Plan the next paid campaign with clear goals and tracking.",
  },
];

const relatedPpcArticles = [
  {
    title: "High-ROI Content Distribution Engine",
    href: "/blog/how-to-build-a-high-roi-content-distribution-engine-for-2026",
    category: "Campaign ROI",
    description: "Learn how to move content and campaign assets across channels so paid traffic supports bigger growth.",
  },
  {
    title: "AJIO 22feet Ecommerce Expansion Strategy",
    href: "/blog/ajio-22feet-a-winning-fashion-e-commerce-digital-expansion-strategy",
    category: "Ecommerce Growth",
    description: "Review a fashion ecommerce strategy lens for acquisition, positioning, and scalable digital demand.",
  },
  {
    title: "Media Strategy Guide 2026",
    href: "/blog/media-strategy-guide-2026-scaling-impact-with-hybrid-models",
    category: "Paid Media",
    description: "Build a more resilient media mix across paid, owned, creator, and campaign channels.",
  },
];

const structuredData = [
  getMarketingServiceJsonLd({
    name: "PPC Advertising Services",
    description:
      "Launch performance-focused PPC campaigns with Digital Corvids across Google, Bing, and social platforms, with testing, tracking, bid management, and ROI reporting.",
    path: "/services/ppc",
    serviceType: "Pay-Per-Click Advertising",
  }),
  getMarketingBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: "PPC Advertising", path: "/services/ppc" },
  ]),
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ppcFaqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  },
];

export default function PPCAdvertising() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeMarketingJsonLd(structuredData) }}
      />
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {/* Header Section */}
          <div className="text-center pt-4 sm:pt-6 md:pt-8 pb-8 sm:pb-10 md:pb-12 lg:pb-16 mb-16">
            <Link href="/services">
              <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-wide mb-3 sm:mb-4 cursor-pointer">
                SERVICES
              </h2>
            </Link>
            <p className="text-white font-glacial-bold text-sm md:text-base uppercase tracking-wider">
              <Link href="/services" className="text-white hover:text-[#F5EE30] transition-colors">
                SERVICES
              </Link>
              <span className="text-gray-500 mx-2">|</span>
              <span className="text-[#3E3E3E] font-glacial-bold">PAY-PER-CLICK (PPC) ADVERTISING</span>
            </p>
          </div>

          {/* First Section - PPC Advertising */}
          <div className="flex flex-col lg:flex-row items-center justify-between mb-16 sm:mb-20 lg:mb-32 gap-8 lg:gap-12">
            {/* Left - Image */}
            <div className="w-full lg:w-1/2 flex justify-center">
              <div className="relative w-full max-w-[280px] sm:max-w-[350px] md:max-w-[400px] lg:max-w-[450px]">
                <Image
                  src="/ppc1.svg"
                  alt="PPC Advertising"
                  width={400}
                  height={400}
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Right - Text Content */}
            <div className="w-full lg:w-1/2">
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-3 sm:mb-4 uppercase tracking-wide flex items-start">
                <span className="w-2 h-2 sm:w-3 sm:h-3 bg-[#F5EE30] rounded-full mr-2 sm:mr-3 mt-1 sm:mt-1.5 flex-shrink-0"></span>
                <span className="leading-relaxed whitespace-normal xl:whitespace-nowrap">Get Instant Visibility, Drive Qualified Traffic, and Maximize ROI</span>
              </h3>
              <h1 className="text-2xl sm:text-4xl md:text-2xl lg:text-3xl xl:text-4xl font-['Etna'] font-bold mb-4 sm:mb-6 text-[#F5EE30] whitespace-normal break-words xl:whitespace-nowrap leading-tight">
                PAY-PER-CLICK (PPC) ADVERTISING
              </h1>
              <p className="text-lg sm:text-xl font-glacial-bold mb-3 sm:mb-4 text-white">OUR MISSION</p>
              <p className="text-white mb-4 sm:mb-6 leading-relaxed text-base sm:text-lg font-['Glacial_Indifference']">
                To deliver high-impact PPC campaigns that put your business in front of the right audience at the right time. We combine strategic targeting, compelling ad copy, and continuous optimization to turn every click into a valuable conversion.
              </p>
              <p className="text-lg sm:text-xl font-glacial-bold mb-3 sm:mb-4 text-white font-['Etna']">OUR VISION</p>
              <p className="text-white leading-relaxed text-base sm:text-lg font-['Glacial_Indifference']">
                To revolutionize digital advertising by creating transparent, data-driven PPC campaigns that consistently outperform industry benchmarks and deliver measurable business growth.
              </p>
            </div>
          </div>

          {/* Second Section - Strategic Campaign Planning */}
          <div className="flex flex-col lg:flex-row-reverse items-center justify-between mb-16 sm:mb-20 lg:mb-32 gap-8 lg:gap-12">
            {/* Right - Image */}
            <div className="w-full lg:w-1/2 flex justify-center">
              <div className="relative w-full max-w-[300px] sm:max-w-[400px] md:max-w-[500px] lg:max-w-[550px]">
                <Image
                  src="/ppc2.svg"
                  alt="Strategic Campaign Planning"
                  width={500}
                  height={400}
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Left - Text Content */}
            <div className="w-full lg:w-1/2">
              <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                <span className="w-2 h-2 sm:w-3 sm:h-3 bg-[#F5EE30] rounded-full mt-1 sm:mt-1.5 flex-shrink-0"></span>
                <span className="uppercase tracking-wide sm:tracking-widest text-xs sm:text-sm md:text-base font-glacial-bold leading-relaxed text-white">
                  We don&apos;t guess—we analyze, optimize, and dominate. Your goals, our blueprint for success.
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 font-['Etna'] leading-tight">
                <span className="block text-white">STRATEGIC</span>
                <span className="block text-[#3E3E3E]">CAMPAIGN PLANNING</span>
              </h2>
              <ul className="space-y-2 sm:space-y-3 text-white text-base sm:text-lg font-['Glacial_Indifference']">
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Comprehensive keyword research and competitor analysis</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Custom campaign architecture tailored to your goals</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Audience segmentation and persona targeting</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Budget allocation strategies for maximum impact</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Conversion funnel mapping and optimization</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Ad Creation & Copywriting Section */}
          <div className="mb-16 sm:mb-20 lg:mb-32 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left - Image */}
            <div className="w-full flex justify-center">
              <div className="relative w-full max-w-[280px] sm:max-w-[350px] md:max-w-[400px] lg:max-w-[450px]">
                <Image
                  src="/ppc3.svg"
                  alt="Ad Creation & Copywriting"
                  width={400}
                  height={400}
                  className="w-full h-auto"
                />
              </div>
            </div>
            {/* Right - Text */}
            <div className="w-full">
              <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                <span className="w-2 h-2 bg-[#F5EE30] rounded-full mt-1 flex-shrink-0"></span>
                <span className="uppercase tracking-wide sm:tracking-widest text-xs sm:text-sm text-white font-glacial-bold leading-relaxed">
                  Ads that stop scrolls, spark curiosity, and force clicks.
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-['Etna'] font-extrabold leading-tight mb-4 sm:mb-6">
                <span className="text-white">AD CREATION</span><br />
                <span className="text-[#3E3E3E]">& COPYWRITING</span>
              </h2>
              <ul className="space-y-2 sm:space-y-3 text-white text-base sm:text-lg font-['Glacial_Indifference']">
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>High-converting ad copy that speaks to user intent</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Eye-catching display ads and responsive search ads</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>A/B testing of headlines, descriptions, and CTAs</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Ad extensions setup (sitelinks, callouts, structured snippets)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Landing page recommendations for better Quality Scores</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Platform Mastery Section */}
          <div className="mb-16 sm:mb-20 lg:mb-32 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Image - Top on mobile, Right on desktop */}
            <div className="w-full flex justify-center order-1 lg:order-2">
              <div className="relative w-full max-w-[280px] sm:max-w-[350px] md:max-w-[400px] lg:max-w-[450px]">
                <Image
                  src="/ppc4.svg"
                  alt="Platform Mastery"
                  width={400}
                  height={400}
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Text - Bottom on mobile, Left on desktop */}
            <div className="w-full order-2 lg:order-1">
              <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                <span className="w-2 h-2 bg-[#F5EE30] rounded-full mt-1 flex-shrink-0"></span>
                <span className="uppercase tracking-wide sm:tracking-widest text-xs sm:text-sm text-white font-glacial-bold leading-relaxed">
                  Google, Meta, TikTok, LinkedIn—we conquer every advertising arena with data-driven precision.
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-['Etna'] font-extrabold leading-tight mb-4 sm:mb-6">
                <span className="text-white">PLATFORM</span><br />
                <span className="text-[#3E3E3E]">MASTERY</span>
              </h2>
              <ul className="space-y-2 sm:space-y-3 text-white text-base sm:text-lg font-['Glacial_Indifference']">
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Google Ads (Search, Display, Shopping, YouTube)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Microsoft Advertising (Bing Ads)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Facebook & Instagram Ads</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>LinkedIn Ads for B2B targeting</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Amazon Advertising and other e-commerce platforms</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bid Management & Optimization Section */}
          <div className="mb-16 sm:mb-20 lg:mb-32 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left - Image */}
            <div className="w-full flex justify-center">
              <div className="relative w-full max-w-[280px] sm:max-w-[350px] md:max-w-[400px] lg:max-w-[450px]">
                <Image
                  src="/ppc5.svg"
                  alt="Bid Management & Optimization"
                  width={400}
                  height={400}
                  className="w-full h-auto"
                />
              </div>
            </div>
            {/* Right - Text */}
            <div className="w-full">
              <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                <span className="w-2 h-2 bg-[#F5EE30] rounded-full mt-1 flex-shrink-0"></span>
                <span className="uppercase tracking-wide sm:tracking-widest text-xs sm:text-sm text-white font-glacial-bold leading-relaxed">
                  Smart bids, smarter results. We outplay algorithms to lower costs and boost profits.
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-['Etna'] font-extrabold leading-tight mb-4 sm:mb-6">
                <span className="text-white">BID MANAGEMENT</span><br />
                <span className="text-gray-400">& OPTIMIZATION</span>
              </h2>
              <ul className="space-y-2 sm:space-y-3 text-white text-base sm:text-lg font-['Glacial_Indifference']">
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Automated and manual bidding strategies</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Real-time bid adjustments based on performance</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Device, location, and time-of-day bid optimization</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Negative keyword management to reduce wasted spend</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Quality Score improvement for lower CPCs</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Transparent Analytics & Reporting Section */}
          <div className="mb-16 sm:mb-20 lg:mb-24 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Image - Top on mobile, Right on desktop */}
            <div className="w-full flex justify-center order-1 lg:order-2">
              <div className="relative w-full max-w-[280px] sm:max-w-[350px] md:max-w-[400px] lg:max-w-[450px]">
                <Image
                  src="/ppc6.svg"
                  alt="Transparent Analytics & Reporting"
                  width={400}
                  height={400}
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Text - Bottom on mobile, Left on desktop */}
            <div className="w-full order-2 lg:order-1">
              <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                <span className="w-2 h-2 bg-[#F5EE30] rounded-full mt-1 flex-shrink-0"></span>
                <span className="uppercase tracking-wide sm:tracking-widest text-xs sm:text-sm text-white font-glacial-bold leading-relaxed">
                  No vanity metrics—just hard data that proves your ROI.
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-['Etna'] font-extrabold leading-tight mb-4 sm:mb-6">
                <span className="text-white">TRANSPARENT</span><br />
                <span className="text-gray-400">ANALYTICS & REPORTING</span>
              </h2>
              <ul className="space-y-2 sm:space-y-3 text-white text-base sm:text-lg font-['Glacial_Indifference']">
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Custom dashboards tracking key performance metrics</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Weekly and monthly performance reports with actionable insights</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Conversion tracking and attribution modeling</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>ROI and ROAS (Return on Ad Spend) analysis</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Ongoing recommendations for campaign improvements</span>
                </li>
              </ul>
            </div>
          </div>

          {/* PPC Process Section */}
          <section className="mb-16 sm:mb-20 lg:mb-32">
            <div className="mb-10 max-w-3xl">
              <div className="mb-4 flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-[#F5EE30]"></span>
                <span className="font-glacial-bold text-sm uppercase tracking-widest text-white">
                  How We Improve Paid Performance
                </span>
              </div>
              <h2 className="mb-5 text-3xl font-extrabold uppercase leading-tight md:text-5xl">
                <span className="text-white">PPC Process</span>
                <br />
                <span className="text-[#3E3E3E]">From Spend To Scale</span>
              </h2>
              <p className="text-base leading-relaxed text-gray-300 md:text-lg">
                We treat PPC as a measurable acquisition system. Campaigns are planned around intent, tracking, landing
                page quality, and continuous testing so ad spend has a clear path to leads and revenue.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {ppcProcessSteps.map((step, index) => (
                <div key={step.title} className="border border-white/10 bg-white/[0.03] p-6">
                  <p className="mb-5 font-glacial-bold text-sm text-[#F5EE30]">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mb-3 text-xl font-bold uppercase text-white">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-300">{step.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* PPC Proof And Internal Links Section */}
          <section className="mb-16 grid gap-10 sm:mb-20 lg:mb-32 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-[#F5EE30]"></span>
                <span className="font-glacial-bold text-sm uppercase tracking-widest text-white">
                  Tracking, Testing, And Budget Control
                </span>
              </div>
              <h2 className="mb-6 text-3xl font-extrabold uppercase leading-tight md:text-5xl">
                <span className="text-white">What You Can</span>
                <br />
                <span className="text-[#3E3E3E]">Expect From PPC</span>
              </h2>
              <div className="space-y-4">
                {ppcProofPoints.map((point) => (
                  <div key={point} className="flex gap-3 border-b border-white/10 pb-4">
                    <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[#F5EE30]"></span>
                    <p className="text-base leading-relaxed text-gray-300 md:text-lg">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-white/10 bg-white/[0.03] p-6">
              <h3 className="mb-5 text-xl font-bold uppercase text-[#F5EE30]">Related Growth Paths</h3>
              <div className="space-y-5">
                {relatedPpcLinks.map((item) => (
                  <Link key={item.href} href={item.href} className="block group">
                    <span className="block text-base font-bold uppercase text-white transition-colors group-hover:text-[#F5EE30]">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-gray-400">{item.description}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <RelatedArticlesSection
            eyebrow="PPC Reading List"
            title="Guides For Smarter Paid Growth"
            description="Use these articles to connect paid media planning with content distribution, ecommerce demand, and campaign measurement."
            articles={relatedPpcArticles}
          />

          {/* PPC FAQ Section */}
          <section className="mb-20 lg:mb-28">
            <div className="mb-10 text-center">
              <p className="mb-4 font-glacial-bold text-sm uppercase tracking-widest text-[#F5EE30]">
                Common PPC Questions
              </p>
              <h2 className="text-3xl font-extrabold uppercase leading-tight md:text-5xl">
                <span className="text-white">PPC FAQs</span>
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {ppcFaqs.map((item) => (
                <div key={item.question} className="border border-white/10 bg-white/[0.03] p-6">
                  <h3 className="mb-3 text-lg font-bold uppercase text-white">{item.question}</h3>
                  <p className="text-sm leading-relaxed text-gray-300 md:text-base">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
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
          <div className="grid grid-cols-3 lg:grid-cols-5 gap-6 text-center py-10 px-4">

            {/* Card 1 */}
            <div className="flex flex-col items-center px-2">
              <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
                ROI Discipline
              </h3>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
                Every campaign is oriented around measurable returns, conversion quality, wasted spend reduction, and useful reporting.
              </p>
            </div>

            {/* Card 2 */}
            <div className="flex flex-col items-center px-2">
              <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
                No Lock-Ins
              </h3>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
                We offer flexible planning because client relationships should be built on clarity, performance review, and useful next steps.
              </p>
            </div>

            {/* Card 3 */}
            <div className="flex flex-col items-center px-2">
              <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
                Structured Launches
              </h3>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
                Launch plans cover targeting, tracking, budgets, creative checks, and landing page readiness before spend scales.
              </p>
            </div>

            {/* Card 4 */}
            <div className="flex flex-col items-center px-2">
              <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
                Fraud Protection
              </h3>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
                We implement advanced click fraud monitoring and budget safeguards to ensure your ad spend reaches real potential customers, not bots.
              </p>
            </div>

            {/* Card 5 */}
            <div className="flex flex-col items-center px-2">
              <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
                Ongoing A/B Testing
              </h3>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
                We continuously test ad variations, landing pages, and audience segments so performance can improve with evidence.
              </p>

            </div>

          </div>


          {/* Transform Section */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-10 px-6 md:px-16 pb-12 mt-4">

            <div className="text-center md:text-left max-w-xl">
              <h3 className="text-2xl md:text-3xl font-extrabold leading-snug">
                READY TO SCALE <br />
                <span className="text-gray-400">PAID ACQUISITION?</span>
              </h3>
              <p className="text-sm md:text-base mt-3 text-gray-400 leading-relaxed">
                Let&apos;s discuss how our PPC strategy can help you reach qualified buyers, reduce wasted spend, and turn more clicks into conversions.
              </p>
            </div>

            {/* Circle Button */}
            <div className="flex justify-center md:justify-end">
              <a href="/get-started" className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-white text-black font-bold flex items-center justify-center shadow-lg hover:bg-yellow-400 transition-all">GET STARTED</a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


