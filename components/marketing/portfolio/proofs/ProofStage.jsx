const gridBackdrop = {
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
  backgroundSize: "28px 28px",
};

export function SampleChip({ className = "", label = "Sample" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-dashed border-[#F5EE30] bg-black/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#F5EE30] ${className}`}
    >
      {label}
    </span>
  );
}

// The dark, gridded panel every proof visual sits on. Unpublished case studies
// get a chip ("Sample", or "Draft") so they can never be mistaken for real
// results. `sample` is true, false, or the chip's text.
export default function ProofStage({ sample = false, samplePosition = "top", className = "", children }) {
  return (
    <div className={`relative overflow-hidden rounded-md border border-white/10 bg-[#050505] ${className}`}>
      <div className="pointer-events-none absolute inset-0" style={gridBackdrop} aria-hidden="true" />
      <div className="relative h-full">{children}</div>
      {sample ? (
        <SampleChip
          label={typeof sample === "string" ? sample : "Sample"}
          className={`absolute right-3 z-10 ${samplePosition === "bottom" ? "bottom-3" : "top-3"}`}
        />
      ) : null}
    </div>
  );
}
