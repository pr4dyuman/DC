// The original homepage's yellow band of services, scrolling sideways. It is
// decoration (the services are listed in full just above), so screen readers
// skip it, and it stands still for people who prefer reduced motion.
const services = [
  "SEO",
  "Google Ads",
  "Meta Ads",
  "Social Media Marketing",
  "Website Development",
  "Video Production",
  "Ad Films",
  "Influencer Marketing",
];

export default function ServicesTicker() {
  return (
    <div aria-hidden="true" className="w-full overflow-hidden bg-[#F5EE30] py-4 select-none">
      <div className="dc-marquee">
        <div className="dc-marquee-track dc-services-marquee-track">
          {services.concat(services).map((label, index) => (
            <div key={`${label}-${index}`} className="dc-service-ticker-item flex items-center">
              <span className="flex items-center gap-3 font-etna uppercase text-black md:gap-4">
                <span className="text-2xl leading-none sm:text-3xl md:text-4xl lg:text-5xl">&bull;</span>
                <span className="whitespace-nowrap text-base leading-tight sm:text-lg md:text-xl lg:text-2xl">{label}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
