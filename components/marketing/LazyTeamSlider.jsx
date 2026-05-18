"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const TeamSlider = dynamic(() => import("./TeamSlider"), {
  ssr: false,
  loading: () => <TeamSliderPlaceholder />,
});

function TeamSliderPlaceholder() {
  return (
    <section className="bg-black py-12 sm:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 sm:mb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-2.5 h-2.5 bg-[#F5EE30] rounded-sm"></div>
          <p className="text-white font-bold text-sm sm:text-base uppercase tracking-widest">
            Meet Our Team
          </p>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white uppercase leading-tight lg:w-2/3">
            The Minds Behind
            <span className="block text-[#F5EE30]">Your Success</span>
          </h2>

          <p className="text-gray-300 text-sm lg:text-base leading-relaxed lg:w-1/3">
            Our diverse team of experts brings years of experience in digital marketing,
            web development, and creative strategy to every project.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 sm:px-6 lg:px-8">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-[380px] sm:h-[420px] md:h-[460px] lg:h-[500px] bg-zinc-900"
          />
        ))}
      </div>
    </section>
  );
}

export default function LazyTeamSlider() {
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
      {shouldRender ? <TeamSlider /> : <TeamSliderPlaceholder />}
    </div>
  );
}
