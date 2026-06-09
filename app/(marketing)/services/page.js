import Image from 'next/image';
import Link from 'next/link';

export default function Services() {
  const servicesData = [
    {
      id: "01",
      title: "Web",
      titleHighlight: "development",
      image: "/web3.svg",
      description:
        "Your website is your digital storefront. We build fast, secure, and user-friendly sites optimized for conversions.",
      link: "/services/web-development",
      tagline: "BUILDING DIGITAL EXPERIENCES",
      ctaLabel: "Explore Web Development",
    },
    {
      id: "02",
      title: "Search engine",
      titleHighlight: "optimization",
      image: "/web4.svg",
      description:
        "SEO is the backbone of organic growth. We optimize your website to rank higher on Google, drive targeted traffic, and turn visitors into loyal customers.",
      link: "/services/seo",
      tagline: "RANK HIGHER, GROW FASTER",
      ctaLabel: "Explore SEO",
    },
    {
      id: "03",
      title: "Social Media",
      titleHighlight: "marketing",
      image: "/smm1.svg",
      description:
        "Build a loyal audience and amplify your brand's voice across platforms like Facebook, Instagram, LinkedIn, and Pinterest.",
      link: "/services/social-media-marketing",
      tagline: "BUILD COMMUNITY",
      ctaLabel: "Explore Social Media Marketing",
    },
    {
      id: "04",
      title: "Video & Ad",
      titleHighlight: "Production",
      image: "/vpd1.svg",
      description:
        "We craft high-quality, compelling videos that tell your brand's story, drive engagement, and convert viewers into customers.",
      link: "/services/video-production-ad",
      tagline: "STORY-LED CONTENT",
      ctaLabel: "Explore Video Production",
    },
    {
      id: "05",
      title: "PPC",
      titleHighlight: "Advertising",
      image: "/ppc1.svg",
      description:
        "Get immediate visibility with targeted ads on Google, Bing, and social media. We craft campaigns that maximize ROI and minimize wasted spend.",
      link: "/services/ppc",
      tagline: "IMMEDIATE RESULTS",
      ctaLabel: "Explore PPC Advertising",
    },
    {
      id: "06",
      title: "Influencer",
      titleHighlight: "Marketing",
      image: "/inf1.svg",
      description: "Partner with influencers who align with your brand to reach highly engaged audiences.",
      link: "/services/influencer-marketing",
      tagline: "CREATORS THAT CONVERT",
      ctaLabel: "Explore Influencer Marketing",
    },
    {
      id: "07",
      title: "Manage",
      titleHighlight: "Company",
      image: "/dashboard-mockup-service-1200-q92.webp",
      imageWidth: 1200,
      imageHeight: 860,
      imageClassName: "h-auto w-72 sm:w-[26rem] md:w-[34rem] lg:w-[34rem] max-w-full",
      imageSizes: "(min-width: 1024px) 544px, (min-width: 768px) 544px, (min-width: 640px) 416px, 288px",
      description: "AI-powered agency management platform. Track projects, manage finances, automate invoicing, and let AI handle the heavy lifting.",
      link: "/services/manage-company",
      tagline: "AI-POWERED MANAGEMENT",
      ctaLabel: "Explore Manage Company",
    },
    {
      id: "08",
      title: "AI",
      titleHighlight: "Blogger",
      image: "/ai-blogger.svg",
      description:
        "Plan, generate, optimize, and schedule SEO-focused blogs from one clean workflow built for agencies and growth teams.",
      link: "/services/ai-blogger",
      tagline: "CONTENT ENGINE FOR GROWTH",
      ctaLabel: "Explore AI Blogger",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 pt-4 sm:pt-6 md:pt-8 pb-8 sm:pb-10 md:pb-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-wide mb-4">SERVICES</h1>
          <p className="text-[#F5EE30] font-glacial-bold text-xl md:text-2xl uppercase tracking-wider">WHAT WE DO</p>
        </div>

        {/* Services Grid - Zigzag Layout */}
        {servicesData.map((service, index) => {
          const isEven = index % 2 === 0;
          const imageWidth = service.imageWidth ?? 420;
          const imageHeight = service.imageHeight ?? 420;
          const imageClassName = service.imageClassName ?? "h-auto w-40 sm:w-56 md:w-80 lg:w-auto";
          const imageSizes = service.imageSizes ?? "(min-width: 1024px) 420px, (min-width: 768px) 320px, (min-width: 640px) 224px, 160px";

          return (
            <div key={service.id}>
              <div className={`flex flex-col lg:flex-row items-center justify-between mb-16 lg:mb-28`}>
                {/* Image Section */}
                <div className={`w-full lg:w-1/2 flex justify-center mb-8 lg:mb-0 ${isEven ? 'lg:pr-12 order-1' : 'lg:pl-12 order-1 lg:order-2'
                  }`}>
                  <div className="relative">
                    <Image
                      src={service.image}
                      alt={`${service.title} ${service.titleHighlight}`}
                      width={imageWidth}
                      height={imageHeight}
                      priority={index === 0}
                      sizes={imageSizes}
                      className={imageClassName}
                    />
                  </div>
                </div>

                {/* Content Section */}
                <div className={`w-full lg:w-1/2 ${isEven ? 'lg:pl-12 order-2' : 'lg:pr-12 order-2 lg:order-1'
                  }`}>
                  <h3 className={`text-[#F5EE30] text-sm font-semibold mb-3 uppercase tracking-wide text-center ${isEven ? 'lg:text-left' : 'lg:text-right'
                    }`}>
                    {service.tagline}
                  </h3>
                  <h2 className={`text-3xl md:text-4xl font-extrabold mb-4 text-center uppercase ${isEven ? 'lg:text-left' : 'lg:text-right'
                    }`}>
                    {service.title} <span className="text-[#F5EE30]">{service.titleHighlight}</span>
                  </h2>
                  <p className={`text-gray-300 mb-6 leading-relaxed text-lg text-center ${isEven ? 'lg:text-left' : 'lg:text-right'
                    }`}>
                    {service.description}
                  </p>
                  <div className={`text-center ${isEven ? 'lg:text-left' : 'lg:text-right'}`}>
                    <Link
                      href={service.link}
                      prefetch={false}
                      className="inline-block bg-white text-black font-bold uppercase px-6 py-3 rounded-full hover:bg-[#F5EE30] transition-all w-full sm:w-auto text-center"
                    >
                      {service.ctaLabel}
                    </Link>
                  </div>
                </div>
              </div>

              {/* Divider - only show on mobile and not after last item */}
              {index < servicesData.length - 1 && (
                <div className="h-px bg-white/10 my-10 lg:hidden"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

