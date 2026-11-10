"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const TestimonialSection = dynamic(() => import("./testomonial"), {
  ssr: false,
  loading: () => <TestimonialPlaceholder />,
});

// Nothing shows while testimonials load: the section appears only when there
// are testimonials, so visitors never see a "loading" line that then vanishes.
function TestimonialPlaceholder() {
  return null;
}

export default function LazyTestimonialSection() {
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
      {shouldRender ? <TestimonialSection /> : <TestimonialPlaceholder />}
    </div>
  );
}
