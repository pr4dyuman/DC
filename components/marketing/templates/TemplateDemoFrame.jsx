"use client";

import { useEffect, useRef, useState } from "react";

// What a demo may do inside our pages: run its scripts and forms and open new
// tabs, but never navigate the page around it.
const DEMO_SANDBOX = "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox";

// A template's live demo in an iframe. With `viewportWidth`, the demo is laid
// out at that width (desktop by default) and scaled down to fit the box, so a
// small box still shows the desktop design. With `viewportWidth={null}` it
// simply fills the box. The box itself is positioned by `className`.
export default function TemplateDemoFrame({ src, title, viewportWidth = 1440, autoFocus = false, className = "" }) {
  const boxRef = useRef(null);
  const frameRef = useRef(null);
  const focusedRef = useRef(false);
  const [box, setBox] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const scaled = Boolean(viewportWidth);

  useEffect(() => {
    const element = boxRef.current;
    if (!scaled || !element) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setBox({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [scaled]);

  const ready = !scaled || Boolean(box);

  // Move keyboard focus into the demo once, when the visitor has just asked for it.
  useEffect(() => {
    if (autoFocus && ready && !focusedRef.current) {
      focusedRef.current = true;
      frameRef.current?.focus();
    }
  }, [autoFocus, ready]);

  let frameStyle;
  if (scaled && box) {
    const scale = Math.min(1, box.width / viewportWidth);
    frameStyle = {
      width: box.width / scale,
      height: box.height / scale,
      transform: scale < 1 ? `scale(${scale})` : undefined,
    };
  }

  return (
    <div ref={boxRef} className={`overflow-hidden ${className}`}>
      {ready ? (
        <iframe
          ref={frameRef}
          src={src}
          title={title}
          sandbox={DEMO_SANDBOX}
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setLoaded(true)}
          style={frameStyle}
          className={`absolute left-0 top-0 origin-top-left border-0 bg-white transition-opacity duration-300 ${
            scaled ? "" : "h-full w-full"
          } ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      ) : null}

      {loaded ? null : (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/55" role="status">
          <span className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-black/85 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/80">
            <span
              className="h-3.5 w-3.5 rounded-full border-2 border-white/25 border-t-[#F5EE30] motion-safe:animate-spin"
              aria-hidden="true"
            />
            Loading live demo
          </span>
        </div>
      )}
    </div>
  );
}
