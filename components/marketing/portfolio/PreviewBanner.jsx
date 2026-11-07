// Shown on /portfolio/preview pages, which mix real projects with sample case
// studies and are kept out of search results.
export default function PreviewBanner({ children }) {
  return (
    <div className="border-b border-dashed border-[#F5EE30]/60 bg-[#F5EE30]/[0.08] px-[var(--site-gutter)] py-3">
      <p className="mx-auto flex max-w-[var(--site-content)] flex-col gap-2 text-sm leading-6 text-white sm:flex-row sm:items-center sm:gap-4">
        <span className="w-fit shrink-0 rounded-full border border-dashed border-[#F5EE30] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#F5EE30]">
          Preview
        </span>
        <span>{children}</span>
      </p>
    </div>
  );
}
