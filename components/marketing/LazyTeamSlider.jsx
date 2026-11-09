"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { TeamSliderHeader } from "./TeamSliderHeader";

// Homepage: the team slider loads its photos and slider code only when the
// visitor scrolls near it, so the top of the page loads faster. The header
// shows straight away and the placeholder keeps the same height.
const TeamSlider = dynamic(() => import("./TeamSlider"), {
  ssr: false,
  loading: () => <TeamSliderPlaceholder />,
});

function TeamSliderPlaceholder() {
  return (
    <section aria-labelledby="team-heading" className="bg-black py-14 sm:py-16 lg:py-20">
      <TeamSliderHeader />
      <div className="mx-auto grid max-w-[var(--site-frame)] grid-cols-1 gap-4 px-[var(--site-gutter)] sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={`h-[380px] bg-zinc-900 sm:h-[420px] md:h-[460px] lg:h-[500px] ${index > 0 ? "hidden sm:block" : ""} ${
              index > 1 ? "sm:hidden lg:block" : ""
            }`}
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

    return () => observer.disconnect();
  }, [shouldRender]);

  return <div ref={containerRef}>{shouldRender ? <TeamSlider /> : <TeamSliderPlaceholder />}</div>;
}
