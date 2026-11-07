"use client";

import { useEffect, useRef } from "react";

// A muted walkthrough that loads only when near the viewport and plays only
// while visible. With reduced motion it does not autoplay; controls appear.
export default function PortfolioVideo({ src, poster, label, className = "" }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      video.controls = true;
    }

    const syncPlayback = () => {
      const rect = video.getBoundingClientRect();
      const isNearViewport = rect.width > 0 && rect.bottom > -160 && rect.top < window.innerHeight + 160;

      if (isNearViewport && document.visibilityState === "visible") {
        if (!video.getAttribute("src")) {
          video.setAttribute("src", src);
        }
        if (!reduceMotion) {
          video.play().catch(() => {});
        }
      } else {
        video.pause();
      }
    };

    const observer = new IntersectionObserver(syncPlayback, { rootMargin: "160px 0px", threshold: 0.05 });
    observer.observe(video);
    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      video.pause();
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className={className}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-label={label}
    >
      {label}
    </video>
  );
}
