import Image from "next/image";
import Link from "next/link";
import {
  getMarketingBreadcrumbJsonLd,
  getMarketingServiceJsonLd,
  serializeMarketingJsonLd,
} from "@/lib/marketing-seo";

const videoProductionFaqs = [
  {
    question: "What is included in Digital Corvids video production services?",
    answer:
      "Our video production work can include concept development, scripting, storyboarding, production planning, shooting, editing, motion graphics, sound design, distribution planning, and performance reporting.",
  },
  {
    question: "Do you create videos for ads and social media platforms?",
    answer:
      "Yes. We can create ad films, reels, product demos, explainer videos, testimonials, YouTube videos, and platform-specific cuts for Instagram, LinkedIn, Facebook, and paid campaigns.",
  },
  {
    question: "Can you handle the full video process from idea to final delivery?",
    answer:
      "Yes. We can manage the complete workflow from creative brief and pre-production to filming, post-production, revisions, export formats, and launch recommendations.",
  },
  {
    question: "How do you measure video production success?",
    answer:
      "We connect creative decisions to goals such as watch time, engagement, click-through rate, conversions, social shares, audience retention, and campaign performance.",
  },
];

const videoProductionProcessSteps = [
  {
    title: "Concept",
    description:
      "Define the message, audience, format, channel, creative angle, and campaign goal before production begins.",
  },
  {
    title: "Plan",
    description:
      "Prepare scripts, storyboards, shot lists, schedules, locations, talent needs, production assets, and approvals.",
  },
  {
    title: "Produce",
    description:
      "Capture footage, audio, product shots, interviews, b-roll, and platform-specific creative with a clear shot plan.",
  },
  {
    title: "Polish",
    description:
      "Edit, color grade, mix sound, add motion graphics, export versions, and prepare launch-ready video assets.",
  },
];

const videoProductionProofPoints = [
  "Creative briefs connect every video to a campaign goal and audience insight.",
  "Production plans define formats, deliverables, timelines, and approval checkpoints early.",
  "Post-production includes edits built for platform behavior, not one generic video file.",
  "Distribution recommendations help each asset work across organic, paid, and landing page channels.",
];

const relatedVideoProductionLinks = [
  {
    title: "Social Media Marketing",
    href: "/services/social-media-marketing",
    description: "Use video assets across organic social and community campaigns.",
  },
  {
    title: "PPC Advertising",
    href: "/services/ppc",
    description: "Turn video creative into paid campaigns with measurable results.",
  },
  {
    title: "Influencer Marketing",
    href: "/services/influencer-marketing",
    description: "Combine creator content with brand-led production for trust and reach.",
  },
  {
    title: "Web Development",
    href: "/services/web-development",
    description: "Place videos on fast landing pages that support conversion.",
  },
];

const structuredData = [
  getMarketingServiceJsonLd({
    name: "Video Production and Ad Films",
    description:
      "Create high-impact videos and ad films with Digital Corvids, from pre-production and scripting to production, post-production, distribution, and performance creative.",
    path: "/services/video-production-ad",
    serviceType: "Video Production",
  }),
  getMarketingBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: "Video Production and Ad Films", path: "/services/video-production-ad" },
  ]),
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: videoProductionFaqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  },
];

export default function VideoProduction() {
  return (
    <div className="min-h-screen bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeMarketingJsonLd(structuredData) }}
      />
      
      <div className="max-w-7xl mx-auto px-6 pt-4 sm:pt-6 md:pt-8 pb-8 sm:pb-10 md:pb-12">
        {/* Header Section */}
       <div className="text-center mb-16">
              <Link href="/services">
                <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-wide mb-4 cursor-pointer">
                  SERVICES
                </h2>
              </Link>

              <p className="text-white font-glacial-bold text-sm md:text-base uppercase tracking-wider">
            <Link href="/services" className="text-white hover:text-[#F5EE30] transition-colors">
              SERVICES
            </Link>
            <span className="text-gray-500 mx-2">|</span>
            <span className="text-[#3E3E3E] font-glacial-bold">VIDEO PRODUCTION</span>
            </p>
          </div>

        {/* First Section - Video Production */}
        <div className="flex flex-col lg:flex-row items-center justify-between mb-20 lg:mb-32">
          {/* Left - Image */}
          <div className="w-full lg:w-1/2 flex justify-center mb-8 lg:mb-0 lg:pr-12">
            <div className="relative">
              <Image
                src="/vpd1.svg"
                alt="Video Production Illustration"
                width={400}
                height={400}
                className="max-w-full h-auto"
              />
            </div>
          </div>

          {/* Right - Text Content */}
          <div className="w-full lg:w-1/2 lg:pl-12">
            <p className="text-white text-sm font-glacial-bold mb-4 uppercase tracking-wide">
              CRAFTING CINEMATIC STORIES THAT CAPTIVATE, CONNECT, AND LEAVE A LEGACY
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mb-6 text-[#F5EE30]">
              VIDEO PRODUCTION & AD FILMS
            </h1>
            <h4 className="text-xl font-glacial-bold mb-4 text-white">OUR MISSION</h4>
            <p className="text-white mb-6 leading-relaxed text-lg">
              To produce impactful, emotionally rich video content that not only tells your story but also drives engagement, builds emotional connections, and strengthens brand presence across all digital platforms.
            </p>
            <h4 className="text-xl font-glacial-bold mb-4 text-white">OUR VISION</h4>
            <p className="text-white leading-relaxed text-lg">
              To redefine visual storytelling by blending creativity, technical excellence, and strategic thinking—delivering immersive experiences that inspire action, drive results, and leave lasting impressions.
            </p>
          </div>
        </div>

        {/* Second Section - Pre-Production Planning */}
        <div className="flex flex-col lg:flex-row-reverse items-center justify-between mb-20 lg:mb-32">
          {/* Right - Image */}
          <div className="w-full lg:w-1/2 flex justify-center mb-8 lg:mb-0 lg:pl-12">
            <div className="relative">
              <Image
                src="/vpd2.svg"
                alt="Pre-Production Planning Illustration"
                width={500}
                height={400}
                className="max-w-full h-auto"
              />
            </div>
          </div>

          {/* Left - Text Content */}
          <div className="w-full lg:w-1/2 lg:pr-12">
            <p className="text-white text-sm font-glacial-bold mb-4 uppercase tracking-wide">
              Every detail matters. We lay the groundwork for seamless, stress-free shoots!
            </p>
           <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 uppercase leading-tight">
              <span className="block text-white">Pre-Production </span>
              <span className="block text-[#3E3E3E]">Planning</span>
            </h2>
            <p className="text-white mb-6 leading-relaxed text-lg">
              Great videos begin with meticulous planning. Our pre-production process ensures every element—creative direction, logistics, and timelines—is strategically aligned before the cameras roll.
            </p>
            <ul className="space-y-3 text-white text-lg">
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-3">•</span>
                Concept Development & Creative Briefs
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-3">•</span>
                Scriptwriting & Storyboarding
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-3">•</span>
                Location Scouting & Casting
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-3">•</span>
                Shot Lists & Production Schedules
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-3">•</span>
                Budget Planning & Resource Allocation
              </li>
            </ul>
          </div>
        </div>
        
        {/* High-Impact Production Section */}
        <div className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left - Image */}
          <div className="w-full flex justify-center">
            <div className="relative">
              <Image
                src="/vpd3.svg"
                alt="High-Impact Production illustration"
                width={400}
                height={400}
                className="max-w-full h-auto"
              />
            </div>
          </div>
          {/* Right - Text */}
          <div className="w-full">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-2 h-2 bg-[#F5EE30] rounded-full"></span>
              <span className="uppercase tracking-widest font-glacial-bold text-sm text-white">
                LIGHTS, CAMERA, ACTION: WE BRING YOUR VISION TO LIFE WITH BLOCKBUSTER-LEVEL FINESSE
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-6">
              <span className="text-white">HIGH-IMPACT</span><br />
              <span className="text-[#3E3E3E]">PRODUCTION</span>
            </h2>
            <p className="text-white mb-6 leading-relaxed text-lg">
              From concept to screen, our production crew brings expertise, state-of-the-art equipment, and creative vision to capture stunning visuals that resonate emotionally and deliver on your brand&apos;s message.
            </p>
            <ul className="space-y-3 text-white text-lg">
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Multi-Camera Shoots & Cinematography</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Professional Lighting & Sound Design</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Drone & Aerial Videography</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>On-Set Direction & Talent Management</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Live Event Coverage</li>
            </ul>
          </div>
        </div>

        {/* Post-Production & Editing Section */}
        <div className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Image - Top on mobile, Right on desktop */}
          <div className="w-full flex justify-center order-1 lg:order-2">
            <div className="relative">
              <Image
                src="/vpd4.svg"
                alt="Post-Production & Editing illustration"
                width={400}
                height={400}
                className="max-w-full h-auto"
              />
            </div>
          </div>
          
          {/* Text - Bottom on mobile, Left on desktop */}
          <div className="w-full order-2 lg:order-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-2 h-2 bg-[#F5EE30] rounded-full"></span>
              <span className="uppercase tracking-widest text-sm font-glacial-bold text-white">
                Where raw footage becomes magic—we add the soul, sound, and spark that elevates your story.
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-6">
              <span className="text-white">POST-PRODUCTION</span><br />
              <span className="text-[#3E3E3E]">& EDITING</span>
            </h2>
            <p className="text-white mb-6 leading-relaxed text-lg">
              Our post-production team refines every frame with precision—cutting, color grading, sound mixing, and adding visual effects to elevate your video from good to exceptional.
            </p>
            <ul className="space-y-3 text-white text-lg">
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Video Editing & Story Assembly</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Color Grading & Cinematic Enhancement</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Motion Graphics & Animation</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Sound Design & Audio Mixing</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>VFX & Special Effects Integration</li>
            </ul>
          </div>
        </div>
        
        {/* Ad Films & Commercials Section */}
        <div className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left - Image */}
          <div className="w-full flex justify-center">
            <div className="relative">
               <Image
                src="/vpd5.svg"
                alt="Ad Films & Commercials illustration"
                width={400}
                height={400}
                className="max-w-full h-auto"
              />
            </div>
          </div>
          {/* Right - Text */}
          <div className="w-full">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-2 h-2 bg-[#F5EE30] rounded-full"></span>
              <span className="uppercase tracking-widest text-sm text-white font-glacial-bold">
                ADS THAT DON&apos;T JUST SELL—BUT STICK IN MINDS & HEARTS LIKE YOUR FAVORITE CHORUS
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-6">
              <span className="text-white">AD FILMS</span><br />
              <span className="text-[#3E3E3E]">& COMMERCIALS</span>
            </h2>
            <p className="text-white mb-6 leading-relaxed text-lg">
              We craft advertising campaigns that don&apos;t just reach audiences—they move them. Every frame is designed to inspire action, strengthen brand recall, and deliver measurable ROI.
            </p>
            <ul className="space-y-3 text-white text-lg">
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>TV Commercials & Broadcast Ads</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Social Media Video Campaigns</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Product Demos & Explainer Videos</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Testimonials & Brand Storytelling</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Influencer & Partnership Content</li>
            </ul>
          </div>
        </div>

        {/* Distribution Strategy Section */}
        <div className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          {/* Image - Top on mobile, Right on desktop */}
          <div className="w-full flex justify-center order-1 lg:order-2">
            <div className="relative">
              <Image
                src="/vpd6.svg"
                alt="Distribution Strategy illustration"
                width={400}
                height={400}
                className="max-w-full h-auto"
              />
            </div>
          </div>
          
          {/* Text - Bottom on mobile, Left on desktop */}
          <div className="w-full order-2 lg:order-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-2 h-2 bg-[#F5EE30] rounded-full"></span>
              <span className="uppercase tracking-widest text-sm text-white font-glacial-bold">
                YOUR VIDEO DESERVES AN AUDIENCE—WE MAKE SURE IT REACHES THE RIGHT EYES AT THE RIGHT TIME
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-6">
              <span className="text-white">DISTRIBUTION</span><br />
              <span className="text-[#3E3E3E]">STRATEGY</span>
            </h2>
            <p className="text-white mb-6 leading-relaxed text-lg">
              Creating exceptional content is only half the battle. Our strategic distribution ensures your video reaches the right audience across the most effective channels for maximum engagement and impact.
            </p>
            <ul className="space-y-3 text-white text-lg">
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Platform-Specific Optimization (YouTube, Instagram, LinkedIn)</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Paid Media Campaigns & Targeting</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>SEO & Video Marketing Strategy</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Analytics & Performance Tracking</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Cross-Channel Content Repurposing</li>
            </ul>
          </div>
        </div>

        {/* Video Production Process Section */}
        <section className="mb-20 lg:mb-32">
          <div className="mb-10 max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[#F5EE30]"></span>
              <span className="font-glacial-bold text-sm uppercase tracking-widest text-white">
                How We Turn Ideas Into Video Assets
              </span>
            </div>
            <h2 className="mb-5 text-3xl font-extrabold uppercase leading-tight md:text-5xl">
              <span className="text-white">Video Production Process</span>
              <br />
              <span className="text-[#3E3E3E]">From Concept To Campaign</span>
            </h2>
            <p className="text-base leading-relaxed text-gray-300 md:text-lg">
              We plan video around the audience, platform, message, and business goal before the shoot starts. That
              keeps production focused and makes every final cut easier to use across ads, social, and landing pages.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {videoProductionProcessSteps.map((step, index) => (
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

        {/* Video Production Proof And Internal Links Section */}
        <section className="mb-20 grid gap-10 lg:mb-32 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[#F5EE30]"></span>
              <span className="font-glacial-bold text-sm uppercase tracking-widest text-white">
                Creative, Production, And Performance Alignment
              </span>
            </div>
            <h2 className="mb-6 text-3xl font-extrabold uppercase leading-tight md:text-5xl">
              <span className="text-white">What You Can</span>
              <br />
              <span className="text-[#3E3E3E]">Expect From Video</span>
            </h2>
            <div className="space-y-4">
              {videoProductionProofPoints.map((point) => (
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
              {relatedVideoProductionLinks.map((item) => (
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

        {/* Video Production FAQ Section */}
        <section className="mb-20 lg:mb-28">
          <div className="mb-10 text-center">
            <p className="mb-4 font-glacial-bold text-sm uppercase tracking-widest text-[#F5EE30]">
              Common Video Production Questions
            </p>
            <h2 className="text-3xl font-extrabold uppercase leading-tight md:text-5xl">
              <span className="text-white">Video Production FAQs</span>
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {videoProductionFaqs.map((item) => (
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
     Award-Winning Team
    </h3>
    <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
     Our team of directors, editors, and animators boasts more than 50 industry accolades, bringing world-class expertise to every project regardless of size or budget.
    </p>
  </div>

  {/* Card 2 */}
  <div className="flex flex-col items-center px-2">
    <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
     Speed & Precision
    </h3>
    <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
      We deliver high-quality video content in 15 days or less without cutting creative corners, meeting tight deadlines without sacrificing production value.
    </p>
  </div>

  {/* Card 3 */}
  <div className="flex flex-col items-center px-2">
    <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
      End-to-End Control
    </h3>
    <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
     Our collaborative workflow includes real-time editing portals where you can provide feedback during production, ensuring your vision is perfectly executed.
    </p>
  </div>

  {/* Card 4 */}
  <div className="flex flex-col items-center px-2">
    <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
      Data-Backed Creativity
    </h3>
    <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
      We optimize every video for engagement metrics and conversion rates, blending artistic excellence with performance analytics to create content that performs.
    </p>
  </div>

  {/* Card 5 */}
  <div className="flex flex-col items-center px-2">
    <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
      Proven Impact
    </h3>
    <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
     Our video campaigns achieve an average 70% increase in social shares compared to industry standards, helping your content break through digital noise.
    </p>
  </div>

</div>


  {/* Transform Section */}
  <div className="flex flex-col md:flex-row items-center justify-between gap-10 px-6 md:px-16 pb-12 mt-4">
    
    <div className="text-center md:text-left max-w-xl">
      <h3 className="text-2xl md:text-3xl font-extrabold leading-snug">
        READY TO CREATE <br />
        <span className="text-gray-400">VIDEO THAT PERFORMS?</span>
      </h3>
      <p className="text-sm md:text-base mt-3 text-gray-400 leading-relaxed">
        Let&apos;s discuss how video strategy, production, editing, and distribution can turn your story into campaign-ready assets.
      </p>
    </div>

    {/* Circle Button */}
    <div className="flex justify-center md:justify-end">
      <a href="/get-started" className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-white text-black font-bold flex items-center justify-center shadow-lg hover:bg-yellow-400 transition-all">GET STARTED</a>
    </div>
  </div>
</div>
      
      {/* Footer Section */}
      
    </div>
  );
}


