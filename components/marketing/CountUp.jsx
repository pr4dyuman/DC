"use client";

import { useEffect, useRef, useState } from "react";

// A number that counts up when it scrolls into view, as on the original site.
// The page HTML always holds the final number (for search engines and readers
// without JavaScript), and numbers already on screen when the page opens never
// change. Further down the page the number resets to zero just before it
// scrolls into view, then counts up. People who prefer reduced motion see the
// final number only.
export default function CountUp({ end, prefix = "", suffix = "", duration = 1600 }) {
  const ref = useRef(null);
  const [value, setValue] = useState(end);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return undefined;

    let frame = 0;
    let started = false;

    // Reset while the number is still just below the screen...
    const resetObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setValue(0);
          resetObserver.disconnect();
        }
      },
      { rootMargin: "0px 0px 240px 0px" },
    );

    // ...and count up once it is properly in view.
    const countObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        started = true;
        resetObserver.disconnect();
        countObserver.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          setValue(Math.round(end * (1 - Math.pow(1 - progress, 3))));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );

    resetObserver.observe(element);
    countObserver.observe(element);

    return () => {
      resetObserver.disconnect();
      countObserver.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [end, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {value}
      {suffix}
    </span>
  );
}
