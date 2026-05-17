"use client";

import { useEffect, useRef, useState } from "react";

export default function CountUp({ end, duration = 2, suffix = "", decimals = 0 }) {
  const [count, setCount] = useState(0);
  const elementRef = useRef(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    let animationFrame;
    let observer;
    let hasAnimated = false;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || duration <= 0) {
      animationFrame = requestAnimationFrame(() => setCount(end));
      return () => cancelAnimationFrame(animationFrame);
    }

    const startAnimation = () => {
      if (hasAnimated) return;
      hasAnimated = true;

      const startTime = performance.now();
      const durationMs = duration * 1000;

      const tick = (now) => {
        const progress = Math.min((now - startTime) / durationMs, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 2);

        setCount(end * easedProgress);

        if (progress < 1) {
          animationFrame = requestAnimationFrame(tick);
        } else {
          setCount(end);
        }
      };

      animationFrame = requestAnimationFrame(tick);
    };

    observer = new IntersectionObserver(
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
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, [end, duration]);

  const formattedCount = count.toFixed(decimals);

  return <span ref={elementRef}>{parseFloat(formattedCount) + suffix}</span>;
}
