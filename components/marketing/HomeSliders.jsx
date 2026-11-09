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
