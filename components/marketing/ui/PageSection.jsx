// On phones a row you swipe through (the next card peeks in); a grid from tablet width.
export const MOBILE_SCROLLER =
  "-mx-[var(--site-gutter)] flex snap-x snap-mandatory scroll-px-[var(--site-gutter)] gap-4 overflow-x-auto px-[var(--site-gutter)] pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden";
export const MOBILE_SCROLLER_ITEM = "w-[82%] shrink-0 snap-start md:w-auto";

// A page section with the site's gutters, width and spacing. `intro` takes a
// SectionIntro; `tone="yellow"` gives the brand-yellow band.
export function PageSection({ id, labelledBy, tone = "dark", bordered = true, className = "", children }) {
  const toneClass =
    tone === "yellow" ? "bg-[#F5EE30] text-black" : `bg-black text-white ${bordered ? "border-t border-white/10" : ""}`;

  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={`scroll-mt-6 px-[var(--site-gutter)] py-14 sm:py-16 lg:py-20 ${toneClass} ${className}`}
    >
      <div className="mx-auto max-w-[var(--site-content)]">{children}</div>
    </section>
  );
}

// A section's eyebrow, heading and an optional note on the right.
export function SectionIntro({ eyebrow, title, id, tone = "dark", children }) {
  const yellow = tone === "yellow";

  return (
    <div
      className={`flex flex-col gap-5 border-b pb-8 lg:flex-row lg:items-end lg:justify-between ${
        yellow ? "border-black/20" : "border-white/10"
      }`}
    >
      <div>
        <p
          className={`m-0 font-glacial-bold text-xs uppercase tracking-[0.35em] sm:text-sm ${
            yellow ? "text-black/60" : "text-[#F5EE30]"
          }`}
        >
          {eyebrow}
        </p>
        <h2 id={id} className="mt-4 text-4xl font-bold uppercase leading-none sm:text-5xl">
          {title}
        </h2>
      </div>
      {children ? (
        <div className={`max-w-md text-sm leading-6 ${yellow ? "text-black/70" : "text-gray-400"}`}>{children}</div>
      ) : null}
    </div>
  );
}
