"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { servicesData } from "./homeServicesData";

const ServicesSection = dynamic(() => import("./ServiceSlider"), {
  ssr: false,
  loading: () => <ServicesSectionPlaceholder />,
});

function ServicesSectionPlaceholder() {
  return (
    <div className="bg-black min-h-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 sm:mb-12 lg:mb-16">
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="w-2.5 h-2.5 bg-[#F5EE30] rounded-sm"></div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white uppercase tracking-wider">
            Services
          </h2>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start gap-6 sm:gap-8 lg:gap-10">
          <div className="lg:w-2/3">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white uppercase leading-tight">
              <span className="text-white block">Your Growth Fuelled By</span>
              <span className="text-[#666666] block">Our Expertise</span>
            </h3>
          </div>

          <div className="lg:w-1/3">
            <p className="text-gray-300 text-sm lg:text-base leading-relaxed">
              A brief overview of all the services we provide as a digital marketing agency. Clicking the learn more
              button will lead to each service&apos;s individual page.
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black opacity-50"></div>
        <Image
          src="/ssbg-1600-q74.jpg"
          alt=""
          width={1920}
          height={900}
          loading="lazy"
          fetchPriority="low"
          sizes="100vw"
          className="w-full h-[500px] sm:h-[600px] md:h-[700px] lg:h-[800px] xl:h-[900px] object-cover filter grayscale opacity-50"
        />

        <div className="absolute inset-0 flex items-center overflow-hidden">
          <div className="flex w-full gap-3 sm:gap-4 px-4 sm:px-6 lg:px-8">
            {servicesData.slice(0, 4).map((service) => (
              <Link
                key={service.id}
                href={service.link}
                prefetch={false}
                className="min-w-[78%] sm:min-w-[46%] lg:min-w-[28%] border-l border-r border-white/30 text-white no-underline"
              >
                <div className="relative p-4 md:p-5 lg:p-6 xl:p-8 min-h-[360px] sm:min-h-[420px] lg:min-h-[520px] flex flex-col justify-between bg-gradient-to-t from-black via-black/60 to-transparent">
                  <div>
                    <p className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-white uppercase">
                      .{service.id}
                    </p>
                    <h4 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold uppercase font-etna leading-tight">
                      <span className="block text-white">{service.title}</span>
                      <span className="text-[#F5EE30]">{service.titleHighlight}</span>
                    </h4>
                  </div>

                  <Image
                    src={service.image}
                    alt={`${service.title} ${service.titleHighlight}`}
                    width={260}
                    height={260}
                    loading="lazy"
                    fetchPriority="low"
                    sizes="(min-width: 1024px) 28vw, (min-width: 640px) 46vw, 78vw"
                    className="mx-auto h-[140px] sm:h-[190px] lg:h-[260px] w-full object-contain"
                  />

                  <p className="text-gray-300 text-[10px] font-semibold sm:text-xs lg:text-sm leading-relaxed line-clamp-3">
                    {service.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LazyServicesSection() {
  const containerRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || shouldRender) return;

    const renderWhenNearViewport = () => {
      const rect = container.getBoundingClientRect();

      if (rect.top < window.innerHeight + 900) {
        setShouldRender(true);
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: "700px 0px" },
    );

    observer.observe(container);
    const frameId = requestAnimationFrame(renderWhenNearViewport);
    window.addEventListener("scroll", renderWhenNearViewport, { passive: true });
    window.addEventListener("resize", renderWhenNearViewport);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", renderWhenNearViewport);
      window.removeEventListener("resize", renderWhenNearViewport);
    };
  }, [shouldRender]);

  return (
    <div ref={containerRef}>
      {shouldRender ? <ServicesSection /> : <ServicesSectionPlaceholder />}
    </div>
  );
}
