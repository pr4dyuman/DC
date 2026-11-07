"use client";

import { useEffect, useRef } from "react";

import { formatParsedKpi, parseKpiValue } from "@/lib/marketing-portfolio-charts";

// Shows a result like "+402%" and counts up to it when it scrolls into view.
// The server HTML holds the final value, and screen readers always get it.
export default function KpiNumber({ value, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    const parsed = parseKpiValue(value);
    if (!element || !parsed || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    if (element.getBoundingClientRect().top < window.innerHeight * 0.92) return undefined;

    let frame = 0;
    element.textContent = formatParsedKpi(parsed, 0);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const progress = Math.min((now - start) / 1300, 1);
          const eased = 1 - (1 - progress) ** 3;
          element.textContent = progress < 1 ? formatParsedKpi(parsed, parsed.number * eased) : value;
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      element.textContent = value;
    };
  }, [value]);

  return (
    <span className={className}>
      <span ref={ref} aria-hidden="true">
        {value}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
