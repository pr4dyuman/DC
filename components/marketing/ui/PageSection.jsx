// On phones a row you swipe through (the next card peeks in); a grid from tablet width.
export const MOBILE_SCROLLER =
  "-mx-[var(--site-gutter)] flex snap-x snap-mandatory scroll-px-[var(--site-gutter)] gap-4 overflow-x-auto px-[var(--site-gutter)] pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden";
export const MOBILE_SCROLLER_ITEM = "w-[82%] shrink-0 snap-start md:w-auto";

// The grey second line of a two-tone heading. #6b6b6b keeps 3.9:1 contrast on
// black, enough for large headings.
const ACCENT_CLASSES = {
  muted: "text-[#6b6b6b]",
  yellow: "text-[#F5EE30]",
};

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

// The site's section label: a small yellow square and the label in capitals.
export function Eyebrow({ tone = "dark", className = "", children }) {
  const yellow = tone === "yellow";

  return (
    <p
      className={`m-0 flex items-center gap-3 font-glacial-bold text-sm uppercase tracking-widest ${
        yellow ? "text-black" : "text-white"
      } ${className}`}
    >
      <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-sm ${yellow ? "bg-black" : "bg-[#F5EE30]"}`} />
      {children}
    </p>
  );
}

// A heading in the site's two-tone style: the title in white (or black on
// yellow) and an optional second line in grey or yellow.
export function TwoToneTitle({ title, accent, accentTone = "muted", tone = "dark" }) {
  const accentClass = tone === "yellow" ? "text-black/50" : ACCENT_CLASSES[accentTone] || ACCENT_CLASSES.muted;

  return (
    <>
      <span className="block">{title}</span>
      {accent ? (
        <>
          {" "}
          <span className={`block ${accentClass}`}>{accent}</span>
        </>
      ) : null}
    </>
  );
}

// A section's label, heading and an optional note on the right.
export function SectionIntro({ eyebrow, title, accent, accentTone = "muted", id, tone = "dark", children }) {
  const yellow = tone === "yellow";

  return (
    <div
      className={`flex flex-col gap-5 border-b pb-8 lg:flex-row lg:items-end lg:justify-between ${
        yellow ? "border-black/20" : "border-white/10"
      }`}
    >
      <div>
        <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
        <h2 id={id} className="mt-5 text-4xl font-bold uppercase leading-[1.02] sm:text-5xl xl:text-6xl">
          <TwoToneTitle title={title} accent={accent} accentTone={accentTone} tone={tone} />
        </h2>
      </div>
      {children ? (
        <div className={`max-w-md text-sm leading-6 lg:pb-1 ${yellow ? "text-black/70" : "text-gray-400"}`}>{children}</div>
      ) : null}
    </div>
  );
}
