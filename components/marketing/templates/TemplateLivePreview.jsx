"use client";

import Link from "next/link";
import { Maximize2, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import BrowserFrame from "@/components/marketing/BrowserFrame";
import TemplateDemoFrame from "./TemplateDemoFrame";
import TemplateScrollPreview from "./TemplateScrollPreview";

// Below this box width a desktop-size demo is too small to use in place, so
// "Try live demo" opens the full-screen demo page instead.
const MIN_INLINE_WIDTH = 560;

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5EE30]";

function isPlainClick(event) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

// A template's home-page screenshot in a browser frame. When the template has
// a live demo, "Try live demo" swaps the screenshot for the real site, right
// in the box. Wide boxes run it in place; narrow ones, and modified clicks,
// follow the link to the full-screen demo page.
export default function TemplateLivePreview({
  name,
  slug,
  demoUrl,
  label,
  status,
  image,
  alt,
  sizes,
  priority = false,
  aspectClass = "aspect-[16/10]",
  className = "",
}) {
  const boxRef = useRef(null);
  const startRef = useRef(null);
  const restoreFocusRef = useRef(false);
  const [fitsInline, setFitsInline] = useState(false);
  const [live, setLive] = useState(false);
  const fullScreenHref = `/templates/${slug}/demo`;

  useEffect(() => {
    const element = boxRef.current;
    if (!demoUrl || !element) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setFitsInline(entry.contentRect.width >= MIN_INLINE_WIDTH);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [demoUrl]);

  // After closing the demo, put focus back on the button that opened it.
  useEffect(() => {
    if (!live && restoreFocusRef.current) {
      restoreFocusRef.current = false;
      startRef.current?.focus();
    }
  }, [live]);

  const screenshot = (
    <TemplateScrollPreview image={image} alt={alt} sizes={sizes} priority={priority} className="absolute inset-0" />
  );

  if (!demoUrl) {
    return (
      <BrowserFrame label={label} status={status} className={className}>
        <div className={`relative ${aspectClass}`}>{screenshot}</div>
      </BrowserFrame>
    );
  }

  const startInline = (event) => {
    if (!fitsInline || !isPlainClick(event)) return;
    event.preventDefault();
    setLive(true);
  };

  const closeDemo = () => {
    restoreFocusRef.current = true;
    setLive(false);
  };

  const liveActions = (
    <>
      <span className="mr-1 hidden items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#F5EE30] sm:inline-flex">
        <span className="h-1.5 w-1.5 rounded-full bg-[#F5EE30] motion-safe:animate-pulse" aria-hidden="true" />
        Live
      </span>
      <Link
        href={fullScreenHref}
        prefetch={false}
        data-template-cta="demo"
        data-template-slug={slug}
        className={`inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/80 transition-colors hover:bg-white/10 hover:text-white ${focusRing}`}
      >
        <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
        Full screen
        <span className="sr-only"> {name} demo</span>
      </Link>
      <button
        type="button"
        onClick={closeDemo}
        aria-label={`Close the ${name} live demo`}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white ${focusRing}`}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </>
  );

  return (
    <BrowserFrame label={label} status={status} actions={live ? liveActions : null} className={className}>
      <div ref={boxRef} className={`relative ${aspectClass}`}>
        {screenshot}
        {live ? (
          <TemplateDemoFrame src={demoUrl} title={`${name} template live demo`} autoFocus className="absolute inset-0 z-10" />
        ) : (
          <Link
            ref={startRef}
            href={fullScreenHref}
            prefetch={false}
            onClick={startInline}
            data-template-cta={fitsInline ? "demo_inline" : "demo"}
            data-template-slug={slug}
            className={`absolute bottom-3 left-3 z-10 inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/85 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] backdrop-blur-sm transition-colors hover:border-[#F5EE30] hover:bg-[#F5EE30] hover:text-black sm:bottom-4 sm:left-4 ${focusRing}`}
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            Try live demo
            <span className="sr-only"> of {name}</span>
          </Link>
        )}
      </div>
    </BrowserFrame>
  );
}
