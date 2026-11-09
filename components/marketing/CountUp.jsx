"use client";

import { useEffect, useRef, useState } from "react";

// Renders `end` on the server, so search engines, link previews and visitors
// without JavaScript read the real number ("100+", not "0+"). In the browser,
// a number that starts below the fold drops to 0 and counts up when it
// scrolls into view; one already on screen, or with reduced motion, stays put.
export default function CountUp({ end, duration = 2, prefix = "", suffix = "", decimals = 0 }) {
  const [count, setCount] = useState(end);
  const elementRef = useRef(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || duration <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return;

    let animationFrame = requestAnimationFrame(() => setCount(0));
    let hasAnimated = false;

    const startAnimation = () => {
      if (hasAnimated) return;
      hasAnimated = true;
      cancelAnimationFrame(animationFrame);

      const startTime = performance.now();
      const durationMs = duration * 1000;

      const tick = (now) => {
        const progress = Math.min((now - startTime) / durationMs, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 2);

        setCount(progress < 1 ? end * easedProgress : end);

        if (progress < 1) {
          animationFrame = requestAnimationFrame(tick);
        }
      };

      animationFrame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startAnimation();
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );

    observer.observe(el);

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [end, duration]);

  const formattedCount = count.toFixed(decimals);

  return <span ref={elementRef}>{prefix + parseFloat(formattedCount) + suffix}</span>;
}
