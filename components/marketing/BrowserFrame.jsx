// Browser chrome around a website preview, used by the portfolio and the templates store.
export default function BrowserFrame({ label, status, children, className = "" }) {
  return (
    <div
      className={`overflow-hidden rounded-md border border-white/10 bg-[#050505] transition-colors group-hover:border-[#F5EE30]/45 ${className}`}
    >
      <div className="flex min-h-10 items-center gap-2 border-b border-white/10 bg-white/[0.035] px-3">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#F5EE30]" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/18" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/10 bg-black px-3 py-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F5EE30]" aria-hidden="true" />
          <span className="truncate text-[11px] font-bold tracking-[0.08em] text-white/60">{label}</span>
        </div>
        {status ? (
          <span className="hidden shrink-0 rounded-full border border-[#F5EE30]/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#F5EE30] sm:inline-flex">
            {status}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
