"use client";

import { useEffect, useRef } from "react";

// Plays a muted preview over the poster while the pointer is on the parent.
// Loads nothing until the first hover; skipped for touch and reduced motion.
export default function HoverVideo({ src }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const host = video?.parentElement;
    if (
      !video ||
      !host ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !window.matchMedia("(hover: hover)").matches
    ) {
      return undefined;
    }

    const play = () => {
      if (!video.getAttribute("src")) {
        video.setAttribute("src", src);
      }
      video.style.opacity = "1";
      video.play().catch(() => {});
    };
    const stop = () => {
      video.style.opacity = "0";
      video.pause();
    };

    host.addEventListener("mouseenter", play);
    host.addEventListener("mouseleave", stop);
    return () => {
      host.removeEventListener("mouseenter", play);
      host.removeEventListener("mouseleave", stop);
      video.pause();
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500"
    />
  );
}
