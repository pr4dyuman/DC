"use client";

import { useEffect, useRef, useState } from "react";
import CompanionsSlider from "./CompanionsSlider";

export default function LazyCompanionsSlider() {
  const containerRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || shouldRender) return;
    let frameId;

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
    frameId = requestAnimationFrame(renderWhenNearViewport);
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
    <div ref={containerRef} className="min-h-20 sm:min-h-24">
      {shouldRender ? <CompanionsSlider /> : null}
    </div>
  );
}
