"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Children, useEffect, useRef, useState } from "react";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

// One sideways-scrolling row of template tiles, so the shelf stays one tidy row
// however many templates there are. Arrows page through it on larger screens;
// on phones it swipes. The last child is the "all templates" card.
export default function TemplateRail({ label, children }) {
  const trackRef = useRef(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false, scrollable: false });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      setEdges({ atStart: track.scrollLeft <= 4, atEnd: track.scrollLeft >= max - 4, scrollable: max > 4 });
    };
    const observer = new ResizeObserver(update);
    observer.observe(track);
    track.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", update);
    };
  }, []);

  const page = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const arrowClass = `inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-[#F5EE30] hover:text-[#F5EE30] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/20 disabled:hover:text-white ${focusRing}`;

  return (
    <div>
      <div className={`mb-5 hidden items-center justify-end gap-2 ${edges.scrollable ? "sm:flex" : ""}`}>
        <button type="button" onClick={() => page(-1)} disabled={edges.atStart} aria-label="Previous templates" className={arrowClass}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => page(1)} disabled={edges.atEnd} aria-label="More templates" className={arrowClass}>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <ul
        ref={trackRef}
        aria-label={label}
        className="-mx-[var(--site-gutter)] flex snap-x snap-mandatory scroll-px-[var(--site-gutter)] gap-3 overflow-x-auto px-[var(--site-gutter)] pb-2 [scrollbar-width:none] sm:gap-5 [&::-webkit-scrollbar]:hidden"
      >
        {Children.map(children, (child) => (
          <li className="flex w-[68%] shrink-0 snap-start sm:w-[38%] md:w-[29%] lg:w-[calc((100%-4*1.25rem)/4.4)] 2xl:w-[calc((100%-5*1.25rem)/5.4)] [&>*]:w-full">
            {child}
          </li>
        ))}
      </ul>
    </div>
  );
}
