"use client";

import { useEffect, useRef } from "react";

// Marks its contents data-reveal="hidden" only when they start below the fold,
// then "shown" when scrolled into view, so the .reveal-* CSS animates once.
// Server HTML has no attribute: without JavaScript everything is visible.
export default function RevealOnView({ as: Tag = "div", className, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    if (element.getBoundingClientRect().top < window.innerHeight * 0.92) return undefined;

    element.setAttribute("data-reveal", "hidden");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        element.setAttribute("data-reveal", "shown");
        observer.disconnect();
      },
      { threshold: 0.3 },
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      element.removeAttribute("data-reveal");
    };
  }, []);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
