import Image from "next/image";

// The tools we work with, in the order of their logo files: /dc-camp/1.png is
// Google Analytics, and so on.
const toolLogos = [
  "Google Analytics",
  "Screaming Frog",
  "Hootsuite",
  "Semrush",
  "Brevo",
  "Google Ads",
  "Figma",
  "Sprout Social",
  "Ahrefs",
  "Wix",
  "WordPress",
  "Mailchimp",
  "Shopify",
  "Canva",
  "Adobe",
].map((name, index) => ({ name, src: `/dc-camp/${index + 1}.png` }));

const services = [
  "SEO",
  "PPC Advertising",
  "Content Marketing",
  "Email Marketing",
  "Influencer Marketing",
  "Social Media Marketing",
  "Web Design",
  "Branding",
]
  .concat([
    "SEO",
    "PPC Advertising",
    "Content Marketing",
    "Email Marketing",
    "Influencer Marketing",
    "Social Media Marketing",
    "Web Design",
    "Branding",
  ])
  .concat([
    "SEO",
    "PPC Advertising",
    "Content Marketing",
    "Email Marketing",
    "Influencer Marketing",
    "Social Media Marketing",
    "Web Design",
    "Branding",
  ]);

export function ToolLogosSlider() {
  const repeatedItems = toolLogos.concat(toolLogos);

  return (
    <div className="dc-marquee dc-partners-marquee" aria-label="Tools we work with">
      <div className="dc-marquee-track dc-partners-marquee-track">
        {repeatedItems.map((tool, index) => (
          <div
            key={`${tool.name}-${index}`}
            className="dc-partner-item flex items-center justify-center"
            aria-hidden={index >= toolLogos.length}
          >
            <div className="relative w-full h-[40px] sm:h-[60px] md:h-[80px] overflow-hidden rounded-xl">
              <Image
                src={tool.src}
                alt={`${tool.name} logo`}
                fill
                sizes="(min-width: 1280px) 13vw, (min-width: 1024px) 15vw, (min-width: 768px) 18vw, (min-width: 480px) 22vw, 29vw"
                className="object-contain hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ServicesTicker() {
  const repeatedServices = services.concat(services);

  return (
    <div className="dc-marquee select-none" aria-label="Digital marketing services">
      <div className="dc-marquee-track dc-services-marquee-track">
        {repeatedServices.map((label, idx) => (
          <div
            key={`auto-svc-${idx}`}
            className="dc-service-ticker-item flex items-center"
            aria-hidden={idx >= services.length}
          >
            <span className="font-etna text-black uppercase flex items-center gap-3 md:gap-4">
              <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-none text-black">
                &bull;
              </span>
              <span className="text-base sm:text-lg md:text-xl lg:text-2xl leading-tight whitespace-nowrap">
                {label}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
