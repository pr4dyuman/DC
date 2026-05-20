import Image from "next/image";
import Link from "next/link";
import RelatedArticlesSection from "@/components/marketing/RelatedArticlesSection";
import {
  getMarketingBreadcrumbJsonLd,
  getMarketingServiceJsonLd,
  serializeMarketingJsonLd,
} from "@/lib/marketing-seo";

const influencerMarketingFaqs = [
  {
    question: "What is included in Digital Corvids influencer marketing services?",
    answer:
      "Our influencer marketing services can include creator discovery, audience and engagement checks, campaign strategy, creative briefs, content coordination, approvals, paid amplification, tracking, and ROI reporting.",
  },
  {
    question: "How do you choose the right influencers for a brand?",
    answer:
      "We evaluate audience fit, content quality, engagement authenticity, niche relevance, brand safety, past collaborations, platform strength, and the campaign goal before recommending creators.",
  },
  {
    question: "Can influencer content be used in paid ads?",
    answer:
      "Yes. When usage rights are planned correctly, creator content can be repurposed for paid social, landing pages, testimonials, product launches, and broader campaign assets.",
  },
  {
    question: "How do you measure influencer campaign success?",
    answer:
      "We track metrics such as reach, engagement quality, traffic, conversions, creator-level performance, cost per result, content reuse value, and campaign ROI.",
  },
];

const influencerProcessSteps = [
  {
    title: "Match",
    description:
      "Identify creators whose audience, content style, credibility, and platform strength fit the campaign goal.",
  },
  {
    title: "Brief",
    description:
      "Build clear creative guidelines, deliverables, deadlines, messaging guardrails, usage rights, and approval workflows.",
  },
  {
    title: "Launch",
    description:
      "Coordinate creator content, posting timelines, campaign tracking, UTM links, codes, and paid amplification when needed.",
  },
  {
    title: "Measure",
    description:
      "Review creator performance, engagement quality, traffic, conversions, reuse opportunities, and next campaign learnings.",
  },
];

const influencerProofPoints = [
  "Creators are vetted for audience fit, authenticity, engagement quality, and brand safety.",
  "Campaign briefs balance creative freedom with clear messaging and compliance guardrails.",
  "Tracking connects creator posts to website visits, inquiries, sales, and campaign learnings.",
  "Usage rights and repurposing plans are clarified before content is used beyond the original post.",
];

const relatedInfluencerLinks = [
  {
    title: "Social Media Marketing",
    href: "/services/social-media-marketing",
    description: "Turn creator activity into sustained social momentum.",
  },
  {
    title: "Video Production Ads",
    href: "/services/video-production-ad",
    description: "Create high-quality campaign assets around creator stories.",
  },
  {
    title: "PPC Advertising",
    href: "/services/ppc",
    description: "Amplify influencer content with measurable paid campaigns.",
  },
  {
    title: "Web Development",
    href: "/services/web-development",
    description: "Send campaign traffic to fast, conversion-ready landing pages.",
  },
];

const relatedInfluencerArticles = [
  {
    title: "Vertical-Specific Influencer Campaign Management",
    href: "/blog/vertical-specific-influencer-campaign-management-the-framework",
    category: "Creator Strategy",
    description: "Build influencer campaigns around niche, audience fit, platform behavior, and measurable goals.",
  },
  {
    title: "YouTube Influencer Marketing ROI Guide",
    href: "/blog/youtube-influencer-marketing-campaign-best-practices-the-roi-guide",
    category: "YouTube Campaigns",
    description: "Plan YouTube creator campaigns with stronger briefs, tracking, content usage, and ROI expectations.",
  },
  {
    title: "AI For Influencer Marketing ROI",
    href: "/blog/using-ai-to-optimize-influencer-marketing-roi-a-2026-strategy",
    category: "Campaign Analytics",
    description: "Use AI-assisted analysis to improve creator selection, campaign tracking, and performance decisions.",
  },
];

const structuredData = [
  getMarketingServiceJsonLd({
    name: "Influencer Marketing Services",
    description:
      "Plan and manage influencer campaigns with Digital Corvids, including creator discovery, campaign strategy, content coordination, performance tracking, and ROI reporting.",
    path: "/services/influencer-marketing",
    serviceType: "Influencer Marketing",
  }),
  getMarketingBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: "Influencer Marketing", path: "/services/influencer-marketing" },
  ]),
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: influencerMarketingFaqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  },
];

export default function InfluencerMarketing() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeMarketingJsonLd(structuredData) }}
      />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8  w-full">
        {/* Header Section */}
        <div className="text-center pt-4 sm:pt-6 md:pt-8 pb-8 sm:pb-10 md:pb-12 lg:pb-16 mb-16">
              <Link href="/services">
                <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-wide mb-4 cursor-pointer">
                  SERVICES
                </h2>
              </Link>

              <p className="text-white font-bold text-sm md:text-base uppercase tracking-wider">
            <Link href="/services" className="text-white hover:text-[#F5EE30] transition-colors">
              SERVICES
            </Link>
            <span className="text-gray-500 mx-2">|</span>
            <span className="text-[#3E3E3E] font-glacial-bold">INFLUENCER MARKETING</span>
            </p>
            </div>
        {/* First Section - Influencer Marketing */}
        <div className="flex flex-col lg:flex-row items-center justify-between mb-16 sm:mb-20 lg:mb-32 gap-8 lg:gap-12">
          {/* Left - Image */}
          <div className="w-full lg:w-1/2 flex justify-center">
            <div className="relative w-full max-w-[280px] sm:max-w-[350px] md:max-w-[400px] lg:max-w-[450px]">
              <Image
                src="/inf1.svg"
                alt="Influencer marketing campaign illustration"
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
              <span className="leading-relaxed whitespace-normal font-glacial-bold">Amplify Your Brand with Authentic Voices that Drive Action</span>
            </h3>
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-['Etna'] font-bold mb-4 sm:mb-6 text-[#F5EE30] uppercase whitespace-normal break-words leading-tight">
              Influencer Marketing
            </h1>
            <p className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-white">OUR MISSION</p>
            <p className="text-white mb-4 sm:mb-6 leading-relaxed text-base sm:text-lg font-['Glacial_Indifference']">
              To connect brands with credible creators who can build trust, spark conversation, and turn audience attention into measurable business outcomes.
            </p>
            <p className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-white font-glacial-bold">OUR VISION</p>
            <p className="text-white leading-relaxed text-base sm:text-lg font-['Glacial_Indifference']">
              To make influencer campaigns more strategic, transparent, and performance-focused, so creator partnerships feel authentic and still tie back to growth.
            </p>
          </div>
        </div>

        {/* Second Section - Organic Social Media Growth */}
        <div className="flex flex-col lg:flex-row-reverse items-center justify-between mb-16 sm:mb-20 lg:mb-32 gap-8 lg:gap-12">
          {/* Right - Image */}
          <div className="w-full lg:w-1/2 flex justify-center">
            <div className="relative w-full max-w-[300px] sm:max-w-[400px] md:max-w-[500px] lg:max-w-[550px]">
              <Image
                src="/smm2.svg"
                alt="Organic Social Media Growth"
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
               We find the right voices—not just the loudest ones. Your brand deserves perfect alignment.
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 font-['Etna']  uppercase leading-tight">
              <span className="block text-white">Influencer</span>
              <span className="block text-[#3E3E3E]"> Discovery & Vetting</span>
            </h2>
            <ul className="space-y-2 sm:space-y-3 text-white text-base sm:text-lg font-['Glacial_Indifference']">
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Platform-specific strategy (Instagram, LinkedIn, Facebook, X, Pinterest)</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Viral-worthy content calendars (posts, reels, stories, carousels)</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Community management and real-time engagement</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Hashtag research and trend-jacking (the right way)</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>User-generated content (UGC) campaigns to amplify authenticity</span>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Paid Social Advertising Section */}
        <div className="mb-16 sm:mb-20 lg:mb-32 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left - Image */}
          <div className="w-full flex justify-center">
            <div className="relative w-full max-w-[280px] sm:max-w-[350px] md:max-w-[400px] lg:max-w-[450px]">
              <Image
                src="/smm3.svg"
                alt="Paid Social Advertising"
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
                From brief to brilliance—we design campaigns that feel natural, not salesy.
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-['Etna'] font-extrabold  uppercase leading-tight mb-4 sm:mb-6">
              <span className="text-white">Campaign Strategy </span><br />
              <span className="text-[#3E3E3E]">& Storytelling</span>
            </h2>
            <ul className="space-y-2 sm:space-y-3 text-white text-base sm:text-lg font-['Glacial_Indifference']">
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Campaign setup and optimization (Meta Ads, Pinterest Ads, LinkedIn Ads)</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Audience segmentation and lookalike targeting</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Retargeting campaigns to recover lost leads</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>A/B testing for ad creatives, copy, and CTAs</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Influencer-collaboration ads for trusted social proof</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Content Creation & Storytelling Section */}
        <div className="mb-16 sm:mb-20 lg:mb-32 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Image - Top on mobile, Right on desktop */}
          <div className="w-full flex justify-center order-1 lg:order-2">
            <div className="relative w-full max-w-[280px] sm:max-w-[350px] md:max-w-[400px] lg:max-w-[450px]">
              <Image
                src="/smm4.svg"
                alt="Content Creation & Storytelling"
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
                Creator content that works harder—repurposed across ads, websites, and beyond.
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-['Etna']  uppercase font-extrabold leading-tight mb-4 sm:mb-6">
              <span className="text-white">Content</span><br />
              <span className="text-[#3E3E3E]">Collaboration</span><br />
              <span className="text-[#3E3E3E]">& Amplification</span>
            </h2>
            <ul className="space-y-2 sm:space-y-3 text-white text-base sm:text-lg font-['Glacial_Indifference']">
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Creative concept development and mood boards</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>High-quality photo/video shoots for social feeds</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Meme culture integration (brand-safe and relatable)</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Caption writing that blends brand voice with platform trends</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>GIFs, stickers, and AR filters for interactive engagement</span>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Social Analytics & Performance Optimization Section */}
        <div className="mb-16 sm:mb-20 lg:mb-24 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left - Image */}
          <div className="w-full flex justify-center">
            <div className="relative w-full max-w-[280px] sm:max-w-[350px] md:max-w-[400px] lg:max-w-[450px]">
              <Image
                src="/smm5.svg"
                alt="Social Analytics & Performance Optimization"
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
                We measure what matters—sales, not just likes.
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-['Etna']  uppercase font-extrabold leading-tight mb-4 sm:mb-6">
              <span className="text-white">Performance</span><br />
              <span className="text-gray-400">Analytics & ROI</span><br />
              <span className="text-gray-400">Tracking</span>
            </h2>
            <ul className="space-y-2 sm:space-y-3 text-white text-base sm:text-lg font-['Glacial_Indifference']">
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Monthly performance reports (engagement, reach, conversions)</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Competitor benchmarking and gap analysis</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Sentiment analysis to gauge brand perception</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>ROI tracking for paid and organic efforts</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Platform algorithm updates and pivot strategies</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Influencer Marketing Process Section */}
        <section className="mb-16 sm:mb-20 lg:mb-32">
          <div className="mb-10 max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[#F5EE30]"></span>
              <span className="font-glacial-bold text-sm uppercase tracking-widest text-white">
                How We Build Creator-Led Growth
              </span>
            </div>
            <h2 className="mb-5 text-3xl font-extrabold uppercase leading-tight md:text-5xl">
              <span className="text-white">Influencer Process</span>
              <br />
              <span className="text-[#3E3E3E]">From Match To Measurement</span>
            </h2>
            <p className="text-base leading-relaxed text-gray-300 md:text-lg">
              We plan creator partnerships around audience trust, content quality, platform behavior, and measurable
              action. That keeps influencer campaigns authentic while still connecting them to business results.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {influencerProcessSteps.map((step, index) => (
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

        {/* Influencer Proof And Internal Links Section */}
        <section className="mb-16 grid gap-10 sm:mb-20 lg:mb-32 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[#F5EE30]"></span>
              <span className="font-glacial-bold text-sm uppercase tracking-widest text-white">
                Creator Fit, Brand Safety, And ROI Tracking
              </span>
            </div>
            <h2 className="mb-6 text-3xl font-extrabold uppercase leading-tight md:text-5xl">
              <span className="text-white">What You Can</span>
              <br />
              <span className="text-[#3E3E3E]">Expect From Influencers</span>
            </h2>
            <div className="space-y-4">
              {influencerProofPoints.map((point) => (
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
              {relatedInfluencerLinks.map((item) => (
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
          eyebrow="Influencer Reading List"
          title="Guides For Creator-Led Growth"
          description="Use these articles to plan creator selection, campaign tracking, content usage, and influencer ROI with more confidence."
          articles={relatedInfluencerArticles}
        />

        {/* Influencer FAQ Section */}
        <section className="mb-20 lg:mb-28">
          <div className="mb-10 text-center">
            <p className="mb-4 font-glacial-bold text-sm uppercase tracking-widest text-[#F5EE30]">
              Common Influencer Marketing Questions
            </p>
            <h2 className="text-3xl font-extrabold uppercase leading-tight md:text-5xl">
              <span className="text-white">Influencer Marketing FAQs</span>
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {influencerMarketingFaqs.map((item) => (
              <div key={item.question} className="border border-white/10 bg-white/[0.03] p-6">
                <h3 className="mb-3 text-lg font-bold uppercase text-white">{item.question}</h3>
                <p className="text-sm leading-relaxed text-gray-300 md:text-base">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
        </div>
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
              Creator Network
            </h3>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
              Creator shortlists are built around audience fit, niche relevance, content quality, engagement authenticity, and brand safety.
            </p>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col items-center px-2">
            <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
              No Middlemen
            </h3>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
             We facilitate direct relationships between brands and creators, eliminating unnecessary layers that slow down execution and inflate costs.
            </p>
          </div>

          {/* Card 3 */}
          <div className="flex flex-col items-center px-2">
            <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
              Crisis Management
            </h3>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
              Our team provides rapid response to PR risks or misaligned content, with protocols in place to protect your brand reputation at all times.
            </p>
          </div>

          {/* Card 4 */}
          <div className="flex flex-col items-center px-2">
            <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
              Scalability
            </h3>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
              Whether you need local nano-influencers for grassroots campaigns or global celebrity partnerships, we scale our approach to match your ambitions and budget.
            </p>
          </div>

          {/* Card 5 */}
          <div className="flex flex-col items-center px-2">
            <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
              ROI Tracking
            </h3>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
              Creator activity is connected to traffic, conversions, content reuse, and campaign learnings wherever tracking is available.
            </p>
          </div>

        </div>


          {/* Transform Section */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-10 px-6 md:px-16 pb-12 mt-4">
            
            <div className="text-center md:text-left max-w-xl">
              <h3 className="text-2xl md:text-3xl font-extrabold leading-snug">
                READY TO BUILD <br />
                <span className="text-gray-400">CREATOR-LED DEMAND?</span>
              </h3>
              <p className='text-sm md:text-base mt-3 text-gray-400 leading-relaxed'>
  Let&apos;s discuss how the right creators, content, and tracking can turn audience trust into measurable campaign results.
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
    PROOF WE TRACK
  </h2>

  <div className="relative w-full flex flex-col items-center justify-center px-6 py-12">
    <div className="w-full max-w-6xl flex flex-col md:flex-row items-center md:justify-between text-center gap-10">

      {/* Stat */}
      <div className="flex flex-col items-center flex-1">
        <p className="text-sm md:text-base font-light text-gray-300 leading-relaxed">
          Creator fit is reviewed against audience quality, engagement behavior, content style, and campaign objective.
        </p>
        <div className="w-full md:hidden h-[2px] bg-[#F5EE30] mt-4"></div>
      </div>

      {/* Divider (Desktop Only) */}
      <div className="hidden md:block w-[2px] h-16 bg-[#F5EE30]"></div>

      {/* Stat */}
      <div className="flex flex-col items-center flex-1">
        <p className="text-sm md:text-base font-light text-gray-300 leading-relaxed">
          Performance is measured with UTM links, creator-level reporting, conversion paths, and reuse opportunities.
        </p>
        <div className="w-full md:hidden h-[2px] bg-[#F5EE30] mt-4"></div>
      </div>

      {/* Divider (Desktop Only) */}
      <div className="hidden md:block w-[2px] h-16 bg-[#F5EE30]"></div>

      {/* Stat */}
      <div className="flex flex-col items-center flex-1">
        <p className="text-sm md:text-base font-light text-gray-300 leading-relaxed">
          Final reporting separates reach, engagement quality, traffic, conversions, and next campaign learnings.
        </p>
      </div>

    </div>

    <div className="absolute right-8 top-10 hidden md:block">
      <span className="text-[#F5EE30] text-6xl font-bold">”</span>
    </div>
  </div>
</div>


      </main>
      
    </div>
  );
}


